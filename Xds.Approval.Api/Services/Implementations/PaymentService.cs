using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PdfSharpCore.Pdf;
using PdfSharpCore.Pdf.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Security.Cryptography;
using System.Text;
using Xds.Approval.Api.DTOs.Audit;
using Xds.Approval.Api.Models;
using Xds.Approval.Api.DTOs;
using Xds.Approval.Api.DTOs.Common;
using Xds.Approval.Api.DTOs.Pdf;
using Xds.Approval.Api.DTOs.Payment;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        AppDbContext context,
        IWebHostEnvironment environment,
        IConfiguration configuration,
        ILogger<PaymentService> logger)
    {
        _context = context;
        _environment = environment;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<PaymentRequestResponseDto> CreateAsync(CreatePaymentRequestDto dto, int requestedByUserId)
    {
        var request = new PaymentRequest
        {
            Title = dto.Title,
            Description = dto.Description,
            Amount = dto.Amount,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "GHS" : dto.Currency.Trim().ToUpperInvariant(),
            Deadline = dto.Deadline,
            PaymentType = NormalizePaymentType(dto.PaymentType),
            RequestedBy = requestedByUserId
        };

        _context.PaymentRequests.Add(request);
        await _context.SaveChangesAsync();

        await Log(requestedByUserId, "Create Payment Request", request.Id);

        return await MapToPaymentRequestResponseAsync(request);
    }

    public async Task<List<PaymentRequestResponseDto>> GetAllAsync(int currentUserId, string currentUserRole)
    {
        var query = _context.PaymentRequests
            .Include(request => request.Attachments)
            .AsQueryable();

        query = currentUserRole switch
        {
            "User" => query.Where(request => request.RequestedBy == currentUserId),
            "CEO" => query,
            "Finance" => query.Where(request =>
                request.Status == "CEOApproved" ||
                request.Status == "FinancePrepared" ||
                request.Status == "FinanceAuthorized" ||
                request.Status == "Approved"),
            "HeadOfFinance" => query.Where(request =>
                request.Status == "FinancePrepared" ||
                request.Status == "FinanceAuthorized" ||
                request.Status == "Approved"),
            _ => query.Where(_ => false)
        };

        var requests = await query
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync();

        var response = new List<PaymentRequestResponseDto>(requests.Count);
        foreach (var request in requests)
        {
            response.Add(await MapToPaymentRequestResponseAsync(request));
        }

        return response;
    }

    public async Task<PaymentRequestResponseDto?> GetByIdAsync(int requestId, int currentUserId, string currentUserRole)
    {
        var request = await _context.PaymentRequests
            .Include(paymentRequest => paymentRequest.Attachments)
            .FirstOrDefaultAsync(paymentRequest => paymentRequest.Id == requestId);

        if (request == null)
        {
            return null;
        }

        var canAccess = currentUserRole switch
        {
            "User" => request.RequestedBy == currentUserId,
            "CEO" => true,
            "Finance" => true,
            "HeadOfFinance" => true,
            _ => false
        };

        return canAccess ? await MapToPaymentRequestResponseAsync(request) : null;
    }

    public async Task<ServiceResult> ApproveAsync(ApprovalDto dto, int approvedByUserId)
    {
        var request = await _context.PaymentRequests.FindAsync(dto.PaymentRequestId);
        if (request == null)
        {
            return ServiceResult.Fail(ServiceResultType.NotFound, "Payment request not found.");
        }

        var stage = request.Status switch
        {
            "Pending" => "Initial",
            "FinanceAuthorized" => "Final",
            _ => string.Empty
        };

        if (string.IsNullOrWhiteSpace(stage))
        {
            return ServiceResult.Fail(ServiceResultType.Conflict, "This request is not waiting for CEO approval.");
        }

        request.Status = dto.Status == "Rejected"
            ? "Rejected"
            : stage == "Initial"
                ? "CEOApproved"
                : "Approved";

        var approval = new Approval
        {
            PaymentRequestId = dto.PaymentRequestId,
            ApprovedBy = approvedByUserId,
            Stage = stage,
            Status = dto.Status,
            Comment = dto.Comment,
            ApprovedAt = DateTime.UtcNow
        };

        _context.Approvals.Add(approval);
        await _context.SaveChangesAsync();

        await Log(approvedByUserId, dto.Status == "Rejected"
            ? "CEO Rejected"
            : stage == "Initial"
                ? "CEO Approved Request"
                : "CEO Signed PV", request.Id);

        return ServiceResult.Ok($"Payment request {dto.Status.ToLowerInvariant()} successfully.");
    }

    public async Task<ServiceResult> ProcessFinanceAsync(int requestId, FinanceProcessRequestDto dto, int userId, string userRole)
    {
        var request = await _context.PaymentRequests.FindAsync(requestId);
        if (request == null)
        {
            return ServiceResult.Fail(ServiceResultType.NotFound, "Payment request not found.");
        }

        var finance = await _context.FinanceProcessings.FirstOrDefaultAsync(item => item.PaymentRequestId == requestId);

        if (string.Equals(userRole, "Finance", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Status != "CEOApproved" && request.Status != "FinancePrepared" && request.Status != "FinanceAuthorized")
            {
                return ServiceResult.Fail(ServiceResultType.Conflict, "Finance can only prepare or update PV data before the final CEO signature.");
            }

            if (string.IsNullOrWhiteSpace(dto.CompanyName))
            {
                return ServiceResult.Fail(ServiceResultType.ValidationError, "Company name is required.");
            }

            if (string.IsNullOrWhiteSpace(dto.RecipientName))
            {
                return ServiceResult.Fail(ServiceResultType.ValidationError, "Recipient name is required.");
            }

            if (string.IsNullOrWhiteSpace(dto.RecipientAddress))
            {
                return ServiceResult.Fail(ServiceResultType.ValidationError, "Recipient address is required.");
            }

            if (string.IsNullOrWhiteSpace(dto.RecipientTelephone))
            {
                return ServiceResult.Fail(ServiceResultType.ValidationError, "Recipient telephone is required.");
            }

            var normalizedTelephone = NormalizeGhanaPhoneNumber(dto.RecipientTelephone);
            if (normalizedTelephone is null)
            {
                return ServiceResult.Fail(
                    ServiceResultType.ValidationError,
                    "The Ghana phone number must contain exactly 10 digits. Please update it and try again.");
            }

            var isNewFinancePreparation = finance is null;

            finance ??= new FinanceProcessing
            {
                PaymentRequestId = requestId,
                PreparedBy = userId,
                PreparedAt = DateTime.UtcNow,
                Status = "Prepared"
            };

            finance.PreparedBy = finance.PreparedBy == 0 ? userId : finance.PreparedBy;
            finance.PreparedAt = finance.PreparedAt == default ? DateTime.UtcNow : finance.PreparedAt;
            finance.CompanyName = dto.CompanyName.Trim();
            finance.RecipientName = dto.RecipientName.Trim();
            finance.RecipientAddress = dto.RecipientAddress.Trim();
            finance.RecipientTelephone = normalizedTelephone;

            if (request.Status == "CEOApproved")
            {
                request.Status = "FinancePrepared";
                finance.Status = "Prepared";
            }
            else if (request.Status == "FinancePrepared")
            {
                finance.Status = "Prepared";
            }
            else
            {
                finance.Status = "Authorized";
            }

            if (isNewFinancePreparation)
            {
                _context.FinanceProcessings.Add(finance);
            }

            await _context.SaveChangesAsync();
            await Log(userId, isNewFinancePreparation ? "Finance Prepared PV" : "Finance Updated PV", request.Id);
            return ServiceResult.Ok(isNewFinancePreparation ? "PV prepared successfully." : "PV updated successfully.");
        }

        if (string.Equals(userRole, "HeadOfFinance", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Status != "FinancePrepared" || finance is null)
            {
                return ServiceResult.Fail(ServiceResultType.Conflict, "Only prepared PVs can be authorized by the Finance Manager.");
            }

            if (finance.AuthorizedBy.HasValue)
            {
                return ServiceResult.Fail(ServiceResultType.Conflict, "This PV has already been authorized.");
            }

            finance.AuthorizedBy = userId;
            finance.AuthorizedAt = DateTime.UtcNow;
            finance.Status = "Authorized";
            request.Status = "FinanceAuthorized";

            await _context.SaveChangesAsync();
            await Log(userId, "Finance Manager Authorized PV", request.Id);
            return ServiceResult.Ok("PV authorized successfully.");
        }

        return ServiceResult.Fail(ServiceResultType.Conflict, "You are not allowed to process this request.");
    }

    public async Task<ServiceResult<AttachmentResponseDto>> UploadAttachmentAsync(int requestId, IFormFile file, int currentUserId)
    {
        if (file.Length == 0)
        {
            return ServiceResult<AttachmentResponseDto>.Fail(ServiceResultType.ValidationError, "The uploaded file is empty.");
        }

        var maxFileSizeInBytes = _configuration.GetValue<long?>("FileStorage:MaxFileSizeInBytes") ?? (5 * 1024 * 1024);
        if (file.Length > maxFileSizeInBytes)
        {
            return ServiceResult<AttachmentResponseDto>.Fail(ServiceResultType.ValidationError, "The uploaded file exceeds the maximum allowed size of 5 MB.");
        }

        var allowedExtensions = _configuration.GetSection("FileStorage:AllowedExtensions").Get<string[]>() ??
            [".pdf"];
        var allowedContentTypes = _configuration.GetSection("FileStorage:AllowedContentTypes").Get<string[]>() ??
            [
                "application/pdf"
            ];

        var request = await _context.PaymentRequests
            .Include(paymentRequest => paymentRequest.Attachments)
            .FirstOrDefaultAsync(paymentRequest => paymentRequest.Id == requestId);

        if (request == null)
        {
            return ServiceResult<AttachmentResponseDto>.Fail(ServiceResultType.NotFound, "Payment request not found.");
        }

        var currentUserRole = await _context.AuthUsers
            .Where(user => user.Id == currentUserId)
            .Select(user => user.Role)
            .FirstOrDefaultAsync() ?? string.Empty;

        if (request.RequestedBy != currentUserId &&
            !string.Equals(currentUserRole, "Finance", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(currentUserRole, "HeadOfFinance", StringComparison.OrdinalIgnoreCase))
        {
            return ServiceResult<AttachmentResponseDto>.Fail(ServiceResultType.Conflict, "You are not allowed to upload files to this request.");
        }

        if (request.Status != "Pending" && request.Status != "CEOApproved" && request.Status != "FinancePrepared")
        {
            return ServiceResult<AttachmentResponseDto>.Fail(ServiceResultType.Conflict, "Attachments can only be added before the CEO final signature.");
        }

        var configuredUploadFolder = _configuration["FileStorage:UploadFolder"];
        var uploadRoot = string.IsNullOrWhiteSpace(configuredUploadFolder)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot", "uploads")
            : Path.IsPathRooted(configuredUploadFolder)
                ? configuredUploadFolder
                : Path.Combine(_environment.ContentRootPath, configuredUploadFolder);

        var requestFolder = Path.Combine(uploadRoot, "payment-requests", requestId.ToString());
        Directory.CreateDirectory(requestFolder);

        var safeFileName = Path.GetFileName(file.FileName);
        var extension = Path.GetExtension(safeFileName);
        if (string.IsNullOrWhiteSpace(extension) ||
            !allowedExtensions.Any(allowedExtension => string.Equals(allowedExtension, extension, StringComparison.OrdinalIgnoreCase)))
        {
            return ServiceResult<AttachmentResponseDto>.Fail(
                ServiceResultType.ValidationError,
                "Invalid file type. Only PDF files are allowed.");
        }

        var normalizedContentType = string.IsNullOrWhiteSpace(file.ContentType)
            ? "application/octet-stream"
            : file.ContentType.Trim().ToLowerInvariant();

        if (!allowedContentTypes.Any(contentType => string.Equals(contentType, normalizedContentType, StringComparison.OrdinalIgnoreCase)))
        {
            return ServiceResult<AttachmentResponseDto>.Fail(
                ServiceResultType.ValidationError,
                "Invalid MIME type for uploaded file.");
        }

        if (!IsMimeTypeValidForExtension(extension, normalizedContentType))
        {
            return ServiceResult<AttachmentResponseDto>.Fail(
                ServiceResultType.ValidationError,
                "The uploaded file MIME type does not match its extension.");
        }

        var generatedFileName = $"{Guid.NewGuid():N}{extension}";
        var fullFilePath = Path.Combine(requestFolder, generatedFileName);

        await using (var stream = File.Create(fullFilePath))
        {
            await file.CopyToAsync(stream);
        }

        var attachment = new Attachment
        {
            PaymentRequestId = requestId,
            FileName = safeFileName,
            ContentType = normalizedContentType,
            FilePath = $"/uploads/payment-requests/{requestId}/{generatedFileName}",
            UploadedBy = currentUserId,
            UploadedAt = DateTime.UtcNow
        };

        _context.Attachments.Add(attachment);
        await _context.SaveChangesAsync();

        await Log(currentUserId, "Upload Attachment", requestId);

        return ServiceResult<AttachmentResponseDto>.Ok(MapToAttachmentResponse(attachment), "File uploaded successfully.");
    }

    public async Task<ServiceResult<FileDownloadDto>> GetAttachmentAsync(int requestId, int attachmentId, int currentUserId, string currentUserRole)
    {
        var request = await _context.PaymentRequests
            .Include(paymentRequest => paymentRequest.Attachments)
            .FirstOrDefaultAsync(paymentRequest => paymentRequest.Id == requestId);

        if (request is null)
        {
            return ServiceResult<FileDownloadDto>.Fail(ServiceResultType.NotFound, "Payment request not found.");
        }

        var canAccess = currentUserRole switch
        {
            "User" => request.RequestedBy == currentUserId,
            "CEO" => true,
            "Finance" => true,
            "HeadOfFinance" => true,
            _ => false
        };

        if (!canAccess)
        {
            return ServiceResult<FileDownloadDto>.Fail(ServiceResultType.Conflict, "You are not allowed to access this attachment.");
        }

        var attachment = request.Attachments?.FirstOrDefault(item => item.Id == attachmentId);
        if (attachment is null)
        {
            return ServiceResult<FileDownloadDto>.Fail(ServiceResultType.NotFound, "Attachment not found.");
        }

        var attachmentPath = ResolveAttachmentPath(attachment);
        if (string.IsNullOrWhiteSpace(attachmentPath) || !File.Exists(attachmentPath))
        {
            _logger.LogWarning(
                "Attachment file missing for request {RequestId}, attachment {AttachmentId}. Stored path: {StoredPath}",
                requestId,
                attachmentId,
                attachment.FilePath);

            return ServiceResult<FileDownloadDto>.Fail(ServiceResultType.NotFound, "Attachment file not found on the server.");
        }

        byte[] fileBytes;
        try
        {
            fileBytes = await File.ReadAllBytesAsync(attachmentPath);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _logger.LogError(
                exception,
                "Unable to read attachment file for request {RequestId}, attachment {AttachmentId} from {AttachmentPath}",
                requestId,
                attachmentId,
                attachmentPath);

            throw;
        }

        return ServiceResult<FileDownloadDto>.Ok(new FileDownloadDto
        {
            Content = fileBytes,
            ContentType = string.IsNullOrWhiteSpace(attachment.ContentType) ? "application/octet-stream" : attachment.ContentType,
            FileName = string.IsNullOrWhiteSpace(attachment.FileName) ? Path.GetFileName(attachmentPath) : attachment.FileName
        });
    }

    public async Task<ServiceResult<FileDownloadDto>> GeneratePdfAsync(int requestId, int currentUserId, string currentUserRole)
    {
        var accessibleRequestResult = await GetAccessibleProcessedRequestAsync(requestId, currentUserId, currentUserRole);
        if (!accessibleRequestResult.Success)
        {
            return ServiceResult<FileDownloadDto>.Fail(accessibleRequestResult.ResultType, accessibleRequestResult.Message);
        }

        var request = accessibleRequestResult.Data!;
        var finalApproval = await _context.Approvals
            .Where(approval => approval.PaymentRequestId == requestId && approval.Stage == "Final")
            .OrderByDescending(approval => approval.ApprovedAt)
            .FirstOrDefaultAsync();
        var financeProcessing = await _context.FinanceProcessings
            .Where(finance => finance.PaymentRequestId == requestId)
            .OrderByDescending(finance => finance.PreparedAt)
            .FirstOrDefaultAsync();

        var relevantUserIds = new[] { request.RequestedBy, financeProcessing?.PreparedBy, financeProcessing?.AuthorizedBy, finalApproval?.ApprovedBy }
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var usersById = (await _context.AuthUsers
            .Select(user => new { user.Id, user.FullName })
            .ToListAsync())
            .Where(user => relevantUserIds.Contains(user.Id))
            .ToDictionary(user => user.Id, user => user.FullName);

        var preparedBy = financeProcessing is null ? "-" : usersById.GetValueOrDefault(financeProcessing.PreparedBy, $"User {financeProcessing.PreparedBy}");
        var financeManagerName = ToDisplayName(_configuration["PdfTemplate:FinanceManagerName"] ?? "JOHN MENSAH ASILENU");
        var headOfFinanceName = ToDisplayName(_configuration["PdfTemplate:HeadOfFinanceName"] ?? "Nicholas Adams Ayogpo");
        var hasFinanceAuthorization = request.Status is "FinanceAuthorized" or "Approved"
            || financeProcessing?.AuthorizedAt is not null
            || financeProcessing?.AuthorizedBy is not null;
        var hasFinalCeoSignature = request.Status == "Approved" || finalApproval is not null;
        var reviewedBy = hasFinanceAuthorization ? financeManagerName : "-";
        var approvedBy = hasFinalCeoSignature ? headOfFinanceName : "-";
        var ceoApprovedBy = finalApproval is null ? "-" : ToDisplayName(usersById.GetValueOrDefault(finalApproval.ApprovedBy, $"User {finalApproval.ApprovedBy}"));
        var companyName = string.IsNullOrWhiteSpace(financeProcessing?.CompanyName) ? request.Title : financeProcessing.CompanyName;
        var recipientName = string.IsNullOrWhiteSpace(financeProcessing?.RecipientName) ? "-" : financeProcessing.RecipientName;
        var recipientAddress = string.IsNullOrWhiteSpace(financeProcessing?.RecipientAddress) ? "-" : financeProcessing.RecipientAddress;
        var recipientTelephone = string.IsNullOrWhiteSpace(financeProcessing?.RecipientTelephone) ? "-" : financeProcessing.RecipientTelephone;
        var documentNumber = BuildDocumentNumber(request);
        var verificationCode = BuildVerificationCode(request, finalApproval, financeProcessing);
        var companyEmail = _configuration["PdfTemplate:CompanyEmail"] ?? "ask@xdsdata.com";
        var companyAddress = _configuration["PdfTemplate:CompanyAddress"] ?? "The Octagon, Accra Central, 7th Floor";
        var companyPhone = (_configuration.GetSection("PdfTemplate:FinanceContacts").Get<string[]>() ?? [])
            .FirstOrDefault(contact => !string.IsNullOrWhiteSpace(contact)) ?? "030 276 9916";
        var companyWebsite = _configuration["PdfTemplate:CompanyWebsite"] ?? "xdsdataghana.com";
        var companyLicense = _configuration["PdfTemplate:CompanyLicense"] ?? "Credit Bureau License: 001";
        var logoBytes = LoadPdfLogo();
        var headFinanceSignature = hasFinanceAuthorization ? LoadSignatureImage("HeadOfFinance") : null;
        var ceoSignature = hasFinalCeoSignature ? LoadSignatureImage("CEO") : null;
        var attachmentNames = request.Attachments?
            .Where(attachment => attachment.UploadedBy == request.RequestedBy)
            .OrderBy(attachment => attachment.UploadedAt)
            .Select(attachment => attachment.FileName)
            .ToList() ?? [];

        byte[] pdfBytes;
        try
        {
            pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(24);
                    page.DefaultTextStyle(style => style.FontSize(10).FontColor(Colors.Black));

                    page.Header().Column(column =>
                    {
                        column.Item().Row(row =>
                        {
                            row.ConstantItem(180).Height(60).Element(element =>
                            {
                                if (logoBytes is not null)
                                {
                                    element.Image(logoBytes).FitArea();
                                }
                            });
                        });
                        column.Item().LineHorizontal(8).LineColor(Colors.Green.Darken2);
                    });

                    page.Footer().PaddingTop(12).Element(container =>
                    {
                        container
                            .BorderTop(1)
                            .BorderColor(Colors.Grey.Lighten2)
                            .Background(Colors.White)
                            .PaddingVertical(14)
                            .PaddingHorizontal(18)
                            .Column(column =>
                            {
                                column.Spacing(8);

                                column.Item().Row(row =>
                                {
                                    row.RelativeItem().Text($"Tel  {companyPhone}").FontColor(Colors.Grey.Darken3).FontSize(10);
                                    row.RelativeItem().Text($"Email  {companyEmail}").FontColor(Colors.Grey.Darken3).FontSize(10);
                                });

                                column.Item().Row(row =>
                                {
                                    row.RelativeItem().Text($"Web  {companyWebsite}").FontColor(Colors.Grey.Darken3).FontSize(10);
                                    row.RelativeItem().Text($"Address  {companyAddress}").FontColor(Colors.Grey.Darken3).FontSize(10);
                                });

                                column.Item().Text(companyLicense).FontColor(Colors.Grey.Darken2).FontSize(10);
                            });
                    });

                    page.Content().Column(column =>
                    {
                        column.Spacing(10);
                        column.Item().AlignCenter().Text("TRANSFER PAYMENT VOUCHER").Bold().FontSize(16);
                        column.Item().Row(row =>
                        {
                            row.RelativeItem().Text($"NAME: {companyName}".ToUpperInvariant()).Bold();
                            row.ConstantItem(120).AlignRight().Text(documentNumber).Bold();
                        });
                        column.Item().AlignRight().Text("TRANSFER").Bold();

                        column.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(95);
                                columns.RelativeColumn(4);
                                columns.ConstantColumn(90);
                                columns.ConstantColumn(110);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Element(CellStyle).Text("DATE").Bold().AlignCenter();
                                header.Cell().Element(CellStyle).Text("DESCRIPTION").Bold().AlignCenter();
                                header.Cell().Element(CellStyle).Text("TAX(WHT)").Bold().AlignCenter();
                                header.Cell().Element(CellStyle).Text("AMOUNT").Bold().AlignCenter();
                            });

                            table.Cell().Element(DataCellStyle).Text(request.CreatedAt.ToString("dd/MM/yyyy"));
                            table.Cell().Element(DataCellStyle).Column(details =>
                            {
                                details.Spacing(2);
                                details.Item().Text(request.Description).FontSize(11);
                            });
                            var taxProfile = GetTaxProfile(request.PaymentType);
                            var vatAmount = Math.Round(request.Amount * taxProfile.VatRate, 2, MidpointRounding.AwayFromZero);
                            var whtAmount = Math.Round(request.Amount * taxProfile.WhtRate, 2, MidpointRounding.AwayFromZero);
                            var totalAmountIncludingTaxes = request.Amount + vatAmount + whtAmount;
                            var taxRows = BuildPdfTaxRows(request.Amount, taxProfile, vatAmount);

                            table.Cell().Element(DataCellStyle).Column(tax =>
                            {
                                tax.Spacing(2);
                                tax.Item().Text(" ");
                                foreach (var taxRow in taxRows)
                                {
                                    tax.Item().Text(taxRow.Label);
                                }
                            });
                            table.Cell().Element(DataCellStyle).Column(amountColumn =>
                            {
                                amountColumn.Spacing(2);
                                amountColumn.Item().AlignRight().Text(FormatPdfAmount(request.Amount, request.Currency)).Bold();
                                foreach (var taxRow in taxRows)
                                {
                                    amountColumn.Item().AlignRight().Text(FormatPdfAmount(taxRow.Amount, request.Currency));
                                }
                            });

                            table.Cell().ColumnSpan(3).Element(DataCellStyle).Text($"AMOUNT IN WORDS: {ToAmountInWords(totalAmountIncludingTaxes, string.IsNullOrWhiteSpace(request.Currency) ? "GHS" : request.Currency)}".ToUpperInvariant()).Bold();
                            table.Cell().Element(DataCellStyle).AlignRight().Text(FormatPdfAmount(totalAmountIncludingTaxes, request.Currency)).Bold();
                        });

                        column.Item().PaddingTop(6).Table(infoTable =>
                        {
                            infoTable.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn();
                                columns.RelativeColumn();
                                columns.RelativeColumn();
                            });

                            infoTable.Cell().Element(DataCellStyle).Column(details =>
                            {
                                details.Spacing(3);
                                details.Item().Text("PREPARED BY").Bold();
                                details.Item().Text(preparedBy);
                            });

                            infoTable.Cell().Element(DataCellStyle).Column(details =>
                            {
                                details.Spacing(3);
                                details.Item().Text("REVIEWED BY").Bold();
                                details.Item().Text(reviewedBy);
                            });

                            infoTable.Cell().Element(DataCellStyle).Column(details =>
                            {
                                details.Spacing(3);
                                details.Item().Text("APPROVED BY").Bold();
                                details.Item().Text(approvedBy);
                            });

                            infoTable.Cell().Element(DataCellStyle).Column(details =>
                            {
                                details.Spacing(3);
                                details.Item().Text("RECIPIENT NAME").Bold();
                                details.Item().Text(recipientName);
                            });

                            infoTable.Cell().Element(DataCellStyle).Column(details =>
                            {
                                details.Spacing(3);
                                details.Item().Text("ADDRESS").Bold();
                                details.Item().Text(recipientAddress);
                            });

                            infoTable.Cell().Element(DataCellStyle).Column(details =>
                            {
                                details.Spacing(3);
                                details.Item().Text("TELEPHONE").Bold();
                                details.Item().Text(recipientTelephone);
                            });
                        });

                        column.Item().PaddingTop(4).Text($"Verification code: {verificationCode}");

                        if (attachmentNames.Count > 0)
                        {
                            column.Item().Column(files =>
                            {
                                files.Item().Text("ATTACHED DOCUMENTS").Bold();
                                foreach (var name in attachmentNames)
                                {
                                    files.Item().Text($"- {name}");
                                }
                            });
                        }

                        column.Item().PaddingTop(8).Row(row =>
                        {
                            row.Spacing(24);
                            row.RelativeItem().Element(container => ComposeSignatureBlock(container, "Finance Manager", reviewedBy ?? "-", financeProcessing?.AuthorizedAt, headFinanceSignature));
                            row.RelativeItem().Element(container => ComposeSignatureBlock(container, "CEO", ceoApprovedBy ?? "-", finalApproval?.ApprovedAt, ceoSignature));
                        });
                    });
                });
            }).GeneratePdf();
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "PDF generation failed for payment request {RequestId}.", request.Id);
            return ServiceResult<FileDownloadDto>.Fail(ServiceResultType.Conflict, "The PDF could not be generated. Check the PV data, logo/signature files, and QuestPDF configuration.");
        }

        if (request.Status == "Approved")
        {
            try
            {
                SaveArchivedPdf(request.Id, pdfBytes, documentNumber);
            }
            catch (Exception exception)
            {
                _logger.LogWarning(
                    exception,
                    "PDF generated for payment request {RequestId} but archive persistence failed at {ArchiveRoot}.",
                    request.Id,
                    ResolveArchiveRoot());
            }
        }

        return ServiceResult<FileDownloadDto>.Ok(new FileDownloadDto
        {
            Content = pdfBytes,
            ContentType = "application/pdf",
            FileName = $"{documentNumber}.pdf"
        }, "PDF generated successfully.");
    }

    public async Task<ServiceResult<FileDownloadDto>> GetArchivedPdfAsync(int requestId, int currentUserId, string currentUserRole)
    {
        var accessibleRequestResult = await GetAccessibleProcessedRequestAsync(requestId, currentUserId, currentUserRole);
        if (!accessibleRequestResult.Success)
        {
            return ServiceResult<FileDownloadDto>.Fail(accessibleRequestResult.ResultType, accessibleRequestResult.Message);
        }

        var request = accessibleRequestResult.Data!;
        if (request.Status != "Approved")
        {
            return ServiceResult<FileDownloadDto>.Fail(
                ServiceResultType.Conflict,
                "The final PV package is available after both the Finance Manager and the CEO have signed.");
        }

        var regeneratedPdfResult = await GeneratePdfAsync(requestId, currentUserId, currentUserRole);
        if (!regeneratedPdfResult.Success)
        {
            return regeneratedPdfResult;
        }

        var documentNumber = BuildDocumentNumber(request);
        var attachmentFiles = request.Attachments?
            .OrderBy(attachment => attachment.UploadedAt)
            .ToList() ?? [];

        var pdfParts = new List<byte[]>
        {
            regeneratedPdfResult.Data!.Content
        };

        foreach (var attachment in attachmentFiles)
        {
            var attachmentPath = ResolveAttachmentPath(attachment);
            if (string.IsNullOrWhiteSpace(attachmentPath) || !File.Exists(attachmentPath))
            {
                _logger.LogWarning(
                    "Skipping missing attachment {AttachmentId} while building the final merged PDF for request {RequestId}.",
                    attachment.Id,
                    requestId);
                continue;
            }

            try
            {
                pdfParts.Add(await File.ReadAllBytesAsync(attachmentPath));
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                _logger.LogWarning(
                    exception,
                    "Skipping unreadable attachment {AttachmentId} while building the final merged PDF for request {RequestId}.",
                    attachment.Id,
                    requestId);
            }
        }

        var mergedPdfBytes = MergePdfDocuments(pdfParts);

        return ServiceResult<FileDownloadDto>.Ok(
            new FileDownloadDto
            {
                Content = mergedPdfBytes,
                ContentType = "application/pdf",
                FileName = $"{SanitizeFileName(documentNumber)}-full.pdf"
            },
            "Final PV document generated successfully.");
    }

    public async Task<ServiceResult<DocumentVerificationResponseDto>> VerifyDocumentAsync(string? documentNumber, string? verificationCode)
    {
        if (string.IsNullOrWhiteSpace(documentNumber) && string.IsNullOrWhiteSpace(verificationCode))
        {
            return ServiceResult<DocumentVerificationResponseDto>.Fail(
                ServiceResultType.ValidationError,
                "Provide either a document number or a verification code.");
        }

        PaymentRequest? request = null;
        Approval? latestApproval = null;
        FinanceProcessing? latestFinanceProcessing = null;

        if (!string.IsNullOrWhiteSpace(documentNumber) && TryExtractRequestIdFromDocumentNumber(documentNumber, out var requestId))
        {
            request = await _context.PaymentRequests
                .FirstOrDefaultAsync(paymentRequest => paymentRequest.Id == requestId && paymentRequest.Status == "Approved");
        }

        if (request is null && !string.IsNullOrWhiteSpace(verificationCode))
        {
            var processedRequests = await _context.PaymentRequests
                .Where(paymentRequest => paymentRequest.Status == "Approved")
                .OrderByDescending(paymentRequest => paymentRequest.CreatedAt)
                .ToListAsync();

            foreach (var candidate in processedRequests)
            {
                latestApproval = await _context.Approvals
                    .Where(approval => approval.PaymentRequestId == candidate.Id && approval.Stage == "Final")
                    .OrderByDescending(approval => approval.ApprovedAt)
                    .FirstOrDefaultAsync();

                latestFinanceProcessing = await _context.FinanceProcessings
                    .Where(finance => finance.PaymentRequestId == candidate.Id)
                    .OrderByDescending(finance => finance.PreparedAt)
                    .FirstOrDefaultAsync();

                var candidateCode = BuildVerificationCode(candidate, latestApproval, latestFinanceProcessing);
                if (string.Equals(candidateCode, verificationCode, StringComparison.OrdinalIgnoreCase))
                {
                    request = candidate;
                    break;
                }
            }
        }

        if (request is null)
        {
            return ServiceResult<DocumentVerificationResponseDto>.Fail(ServiceResultType.NotFound, "No matching approved document found.");
        }

        latestApproval ??= await _context.Approvals
            .Where(approval => approval.PaymentRequestId == request.Id && approval.Stage == "Final")
            .OrderByDescending(approval => approval.ApprovedAt)
            .FirstOrDefaultAsync();

        latestFinanceProcessing ??= await _context.FinanceProcessings
            .Where(finance => finance.PaymentRequestId == request.Id)
            .OrderByDescending(finance => finance.PreparedAt)
            .FirstOrDefaultAsync();

        var actualDocumentNumber = BuildDocumentNumber(request);
        var actualVerificationCode = BuildVerificationCode(request, latestApproval, latestFinanceProcessing);

        var isMatch = (string.IsNullOrWhiteSpace(documentNumber) || string.Equals(documentNumber, actualDocumentNumber, StringComparison.OrdinalIgnoreCase)) &&
                      (string.IsNullOrWhiteSpace(verificationCode) || string.Equals(verificationCode, actualVerificationCode, StringComparison.OrdinalIgnoreCase));

        return ServiceResult<DocumentVerificationResponseDto>.Ok(new DocumentVerificationResponseDto
        {
            IsValid = isMatch,
            RequestId = request.Id,
            PaymentRequestTitle = request.Title,
            Amount = request.Amount,
            DocumentNumber = actualDocumentNumber,
            VerificationCode = actualVerificationCode,
            Status = request.Status,
            CreatedAt = request.CreatedAt,
            VerifiedAt = DateTime.UtcNow,
            Message = isMatch ? "Document verified successfully." : "Document information does not match."
        }, "Document verification completed.");
    }

    public async Task<ServiceResult<List<AuditLogResponseDto>>> GetAuditLogsAsync(int requestId, int currentUserId, string currentUserRole)
    {
        var accessResult = await GetAccessibleRequestForAuditAsync(requestId, currentUserId, currentUserRole);
        if (!accessResult.Success)
        {
            return ServiceResult<List<AuditLogResponseDto>>.Fail(accessResult.ResultType, accessResult.Message);
        }

        var auditLogs = await _context.AuditLogs
            .Where(log => log.Entity == "PaymentRequest" && log.EntityId == requestId)
            .OrderByDescending(log => log.CreatedAt)
            .Join(
                _context.AuthUsers,
                log => log.UserId,
                user => user.Id,
                (log, user) => new AuditLogResponseDto
                {
                    Id = log.Id,
                    PaymentRequestId = log.EntityId,
                    UserId = log.UserId,
                    UserName = user.Username,
                    Action = log.Action,
                    Details = $"{log.Action} on payment request #{log.EntityId}",
                    Entity = log.Entity,
                    EntityId = log.EntityId,
                    CreatedAt = log.CreatedAt
                })
            .ToListAsync();

        return ServiceResult<List<AuditLogResponseDto>>.Ok(auditLogs);
    }

    public async Task<ServiceResult<List<AuditLogResponseDto>>> SearchAuditLogsAsync(AuditLogQueryDto query, int currentUserId, string currentUserRole)
    {
        if (query.FromUtc.HasValue && query.ToUtc.HasValue && query.FromUtc > query.ToUtc)
        {
            return ServiceResult<List<AuditLogResponseDto>>.Fail(
                ServiceResultType.ValidationError,
                "'FromUtc' cannot be greater than 'ToUtc'.");
        }

        var auditQuery = _context.AuditLogs.AsQueryable();

        if (!string.Equals(currentUserRole, "CEO", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(currentUserRole, "Finance", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(currentUserRole, "HeadOfFinance", StringComparison.OrdinalIgnoreCase))
        {
            var accessibleRequestIds = await _context.PaymentRequests
                .Where(paymentRequest => paymentRequest.RequestedBy == currentUserId)
                .Select(paymentRequest => paymentRequest.Id)
                .ToListAsync();

            auditQuery = auditQuery.Where(log =>
                log.UserId == currentUserId ||
                (log.Entity == "PaymentRequest" && accessibleRequestIds.Contains(log.EntityId)));
        }

        if (query.PaymentRequestId.HasValue)
        {
            auditQuery = auditQuery.Where(log =>
                log.Entity == "PaymentRequest" && log.EntityId == query.PaymentRequestId.Value);
        }

        if (query.UserId.HasValue)
        {
            auditQuery = auditQuery.Where(log => log.UserId == query.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var action = query.Action.Trim();
            auditQuery = auditQuery.Where(log => log.Action.Contains(action));
        }

        if (query.FromUtc.HasValue)
        {
            auditQuery = auditQuery.Where(log => log.CreatedAt >= query.FromUtc.Value);
        }

        if (query.ToUtc.HasValue)
        {
            auditQuery = auditQuery.Where(log => log.CreatedAt <= query.ToUtc.Value);
        }

        var auditLogs = await auditQuery
            .OrderByDescending(log => log.CreatedAt)
            .Join(
                _context.AuthUsers,
                log => log.UserId,
                user => user.Id,
                (log, user) => new AuditLogResponseDto
                {
                    Id = log.Id,
                    PaymentRequestId = log.EntityId,
                    UserId = log.UserId,
                    UserName = user.Username,
                    Action = log.Action,
                    Details = $"{log.Action} on payment request #{log.EntityId}",
                    Entity = log.Entity,
                    EntityId = log.EntityId,
                    CreatedAt = log.CreatedAt
                })
            .ToListAsync();

        return ServiceResult<List<AuditLogResponseDto>>.Ok(auditLogs);
    }

    private async Task Log(int userId, string action, int entityId)
    {
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            Entity = "PaymentRequest",
            EntityId = entityId
        });

        await _context.SaveChangesAsync();
    }

    private async Task<PaymentRequestResponseDto> MapToPaymentRequestResponseAsync(PaymentRequest request)
    {
        var latestInitialApproval = await _context.Approvals
            .Where(approval => approval.PaymentRequestId == request.Id && approval.Stage == "Initial")
            .OrderByDescending(approval => approval.ApprovedAt)
            .FirstOrDefaultAsync();

        var latestFinalApproval = await _context.Approvals
            .Where(approval => approval.PaymentRequestId == request.Id && approval.Stage == "Final")
            .OrderByDescending(approval => approval.ApprovedAt)
            .FirstOrDefaultAsync();

        var latestFinanceProcessing = await _context.FinanceProcessings
            .Where(finance => finance.PaymentRequestId == request.Id)
            .OrderByDescending(finance => finance.PreparedAt)
            .FirstOrDefaultAsync();

        var relevantUserIds = new[]
        {
            request.RequestedBy,
            latestInitialApproval?.ApprovedBy,
            latestFinalApproval?.ApprovedBy,
            latestFinanceProcessing?.PreparedBy,
            latestFinanceProcessing?.AuthorizedBy
        }
        .Where(userId => userId.HasValue)
        .Select(userId => userId!.Value)
        .Distinct()
        .ToList();

        var usersById = (await _context.AuthUsers
            .Select(user => new { user.Id, user.Username, user.FullName, user.Department })
            .ToListAsync())
            .Where(user => relevantUserIds.Contains(user.Id))
            .ToDictionary(user => user.Id, user => new { user.Username, user.FullName, user.Department });

        var requesterInfo = usersById.GetValueOrDefault(request.RequestedBy);
        var requesterName = string.IsNullOrWhiteSpace(requesterInfo?.FullName)
            ? requesterInfo?.Username ?? $"User {request.RequestedBy}"
            : requesterInfo.FullName;
        var requesterDepartment = requesterInfo?.Department ?? "General";
        var approvedByUserName = latestFinalApproval is null
            ? latestInitialApproval is null
                ? null
                : usersById.GetValueOrDefault(latestInitialApproval.ApprovedBy)?.FullName ?? usersById.GetValueOrDefault(latestInitialApproval.ApprovedBy)?.Username ?? $"User {latestInitialApproval.ApprovedBy}"
            : usersById.GetValueOrDefault(latestFinalApproval.ApprovedBy)?.FullName ?? usersById.GetValueOrDefault(latestFinalApproval.ApprovedBy)?.Username ?? $"User {latestFinalApproval.ApprovedBy}";
        var preparedByUserName = latestFinanceProcessing is null
            ? null
            : usersById.GetValueOrDefault(latestFinanceProcessing.PreparedBy)?.FullName ?? usersById.GetValueOrDefault(latestFinanceProcessing.PreparedBy)?.Username ?? $"User {latestFinanceProcessing.PreparedBy}";
        var authorizedByUserName = latestFinanceProcessing?.AuthorizedBy is null
            ? null
            : usersById.GetValueOrDefault(latestFinanceProcessing.AuthorizedBy.Value)?.FullName ?? usersById.GetValueOrDefault(latestFinanceProcessing.AuthorizedBy.Value)?.Username ?? $"User {latestFinanceProcessing.AuthorizedBy.Value}";

        var latestAttachmentUploadedAt = request.Attachments?
            .OrderByDescending(attachment => attachment.UploadedAt)
            .Select(attachment => (DateTime?)attachment.UploadedAt)
            .FirstOrDefault();

        var updatedAtCandidates = new[]
        {
            request.CreatedAt,
            latestInitialApproval?.ApprovedAt ?? request.CreatedAt,
            latestFinalApproval?.ApprovedAt ?? request.CreatedAt,
            latestFinanceProcessing?.PreparedAt ?? request.CreatedAt,
            latestFinanceProcessing?.AuthorizedAt ?? request.CreatedAt,
            latestAttachmentUploadedAt ?? request.CreatedAt
        };

        var documentNumber = request.Status == "Approved"
            ? BuildDocumentNumber(request)
            : null;

        var verificationCode = request.Status == "Approved"
            ? BuildVerificationCode(request, latestFinalApproval, latestFinanceProcessing)
            : null;

        return new PaymentRequestResponseDto
        {
            Id = request.Id,
            Title = request.Title,
            Description = request.Description,
            Amount = request.Amount,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "GHS" : request.Currency,
            Deadline = request.Deadline,
            PaymentType = NormalizePaymentType(request.PaymentType),
            RequestedBy = request.RequestedBy,
            RequesterId = request.RequestedBy.ToString(),
            RequesterName = requesterName,
            RequesterDepartment = requesterDepartment,
            CompanyName = latestFinanceProcessing?.CompanyName,
            RecipientName = latestFinanceProcessing?.RecipientName,
            RecipientAddress = latestFinanceProcessing?.RecipientAddress,
            RecipientTelephone = latestFinanceProcessing?.RecipientTelephone,
            Status = request.Status,
            CreatedAt = request.CreatedAt,
            UpdatedAt = updatedAtCandidates.Max(),
            CeoComment = latestInitialApproval?.Comment ?? latestFinalApproval?.Comment,
            ApprovedByUserId = latestFinalApproval?.ApprovedBy ?? latestInitialApproval?.ApprovedBy,
            ApprovedByUserName = approvedByUserName,
            ApprovedAt = latestFinalApproval?.ApprovedAt ?? latestInitialApproval?.ApprovedAt,
            PreparedByUserId = latestFinanceProcessing?.PreparedBy,
            PreparedByUserName = preparedByUserName,
            PreparedAt = latestFinanceProcessing?.PreparedAt,
            AuthorizedByUserId = latestFinanceProcessing?.AuthorizedBy,
            AuthorizedByUserName = authorizedByUserName,
            AuthorizedAt = latestFinanceProcessing?.AuthorizedAt,
            DocumentNumber = documentNumber,
            VerificationCode = verificationCode,
            Attachments = request.Attachments?.Select(MapToAttachmentResponse).ToList() ?? []
        };
    }

    private static string NormalizePaymentType(string? paymentType)
    {
        if (string.IsNullOrWhiteSpace(paymentType))
        {
            return "Goods";
        }

        return paymentType.Trim().ToLowerInvariant() switch
        {
            "goods" => "Goods",
            "service" => "Service",
            "residence" => "Residence",
            "crossboarder" => "Crossboarder",
            "crossborder" => "Crossboarder",
            "cross border" => "Crossboarder",
            "one-off" => "One-off",
            "one off" => "One-off",
            "once off" => "One-off",
            "once-off" => "One-off",
            "one month" => "One-off",
            "recurring" => "Recurring",
            _ => paymentType.Trim()
        };
    }

    private AttachmentResponseDto MapToAttachmentResponse(Attachment attachment)
    {
        var absolutePath = ResolveAttachmentPath(attachment);

        var fileSize = !string.IsNullOrWhiteSpace(absolutePath) && File.Exists(absolutePath)
            ? new FileInfo(absolutePath).Length
            : 0;

        return new AttachmentResponseDto
        {
            Id = attachment.Id,
            FileName = attachment.FileName,
            FileSize = fileSize,
            ContentType = attachment.ContentType,
            FileUrl = attachment.FilePath,
            UploadedAt = attachment.UploadedAt
        };
    }

    private string? ResolveAttachmentPath(Attachment attachment)
    {
        if (string.IsNullOrWhiteSpace(attachment.FilePath))
        {
            return null;
        }

        var normalizedPath = attachment.FilePath.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
        var configuredUploadFolder = _configuration["FileStorage:UploadFolder"];
        var uploadRoot = string.IsNullOrWhiteSpace(configuredUploadFolder)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot", "uploads")
            : Path.IsPathRooted(configuredUploadFolder)
                ? configuredUploadFolder
                : Path.Combine(_environment.ContentRootPath, configuredUploadFolder);

        var fileName = Path.GetFileName(normalizedPath);
        var requestFolderName = attachment.PaymentRequestId.ToString();

        var candidatePaths = new List<string>();

        if (Path.IsPathRooted(attachment.FilePath))
        {
            candidatePaths.Add(attachment.FilePath);
        }

        candidatePaths.Add(Path.Combine(_environment.ContentRootPath, normalizedPath));
        candidatePaths.Add(Path.Combine(_environment.ContentRootPath, "wwwroot", normalizedPath));

        if (!string.IsNullOrWhiteSpace(_environment.WebRootPath))
        {
            candidatePaths.Add(Path.Combine(_environment.WebRootPath, normalizedPath));
        }

        candidatePaths.Add(Path.Combine(uploadRoot, "payment-requests", requestFolderName, fileName));
        candidatePaths.Add(Path.Combine(uploadRoot, fileName));

        foreach (var candidatePath in candidatePaths
                     .Where(path => !string.IsNullOrWhiteSpace(path))
                     .Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (File.Exists(candidatePath))
            {
                return candidatePath;
            }
        }

        return candidatePaths
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .FirstOrDefault();
    }

    private static (decimal VatRate, decimal WhtRate) GetTaxProfile(string? paymentType)
    {
        var normalizedPaymentType = NormalizePaymentType(paymentType);
        var whtRate = normalizedPaymentType switch
        {
            "Goods" => 0.03m,
            "Service" => 0.05m,
            "Residence" => 0.10m,
            "Crossboarder" => 0.20m,
            _ => 0m
        };

        return (0.15m, whtRate);
    }

    private static List<(string Label, decimal Amount)> BuildPdfTaxRows(decimal baseAmount, (decimal VatRate, decimal WhtRate) taxProfile, decimal vatAmount)
    {
        var rows = new List<(string Label, decimal Amount)>
        {
            ($"VAT {taxProfile.VatRate * 100:0}%", vatAmount),
            ("WHT Goods 3%", taxProfile.WhtRate == 0.03m ? Math.Round(baseAmount * 0.03m, 2, MidpointRounding.AwayFromZero) : 0m),
            ("WHT Service 5%", taxProfile.WhtRate == 0.05m ? Math.Round(baseAmount * 0.05m, 2, MidpointRounding.AwayFromZero) : 0m),
            ("WHT Residence 10%", taxProfile.WhtRate == 0.10m ? Math.Round(baseAmount * 0.10m, 2, MidpointRounding.AwayFromZero) : 0m),
            ("WHT Crossboarder 20%", taxProfile.WhtRate == 0.20m ? Math.Round(baseAmount * 0.20m, 2, MidpointRounding.AwayFromZero) : 0m)
        };

        return rows;
    }

    private static string FormatPdfAmount(decimal amount, string? currency)
    {
        var normalizedCurrency = string.IsNullOrWhiteSpace(currency) ? "GHS" : currency.Trim().ToUpperInvariant();

        return normalizedCurrency == "GHS"
            ? $"{amount:N2} \u20B5"
            : $"{amount:N2} {normalizedCurrency}";
    }

    private static byte[] MergePdfDocuments(IEnumerable<byte[]> pdfParts)
    {
        using var outputDocument = new PdfDocument();

        foreach (var pdfPart in pdfParts.Where(part => part.Length > 0))
        {
            using var inputStream = new MemoryStream(pdfPart);
            using var inputDocument = PdfReader.Open(inputStream, PdfDocumentOpenMode.Import);

            for (var pageIndex = 0; pageIndex < inputDocument.PageCount; pageIndex++)
            {
                outputDocument.AddPage(inputDocument.Pages[pageIndex]);
            }
        }

        using var outputStream = new MemoryStream();
        outputDocument.Save(outputStream, false);
        return outputStream.ToArray();
    }

    private static bool IsMimeTypeValidForExtension(string extension, string contentType)
    {
        var validMimeTypes = extension.ToLowerInvariant() switch
        {
            ".pdf" => new[] { "application/pdf" },
            ".jpg" => new[] { "image/jpeg" },
            ".png" => new[] { "image/png" },
            ".docx" => new[] { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
            ".xlsx" => new[] { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
            _ => Array.Empty<string>()
        };

        return validMimeTypes.Any(validMimeType =>
            string.Equals(validMimeType, contentType, StringComparison.OrdinalIgnoreCase));
    }

    private byte[]? LoadPdfLogo()
    {
        var configuredLogoPath = _configuration["PdfTemplate:LogoPath"];
        var candidatePaths = new List<string>();

        if (!string.IsNullOrWhiteSpace(configuredLogoPath))
        {
            candidatePaths.Add(Path.IsPathRooted(configuredLogoPath)
                ? configuredLogoPath
                : Path.Combine(_environment.ContentRootPath, configuredLogoPath));
        }

        candidatePaths.Add(Path.Combine(_environment.ContentRootPath, "logo", "assets", "xdslogo_green.png"));
        candidatePaths.Add(Path.Combine(_environment.ContentRootPath, "logo", "assets", "xdslogo.png"));
        candidatePaths.Add(Path.Combine(_environment.ContentRootPath, "..", "Xds.Approval.web", "public", "assets", "xdslogo_green.png"));
        candidatePaths.Add(Path.Combine(_environment.ContentRootPath, "..", "Xds.Approval.web", "public", "assets", "xdslogo.png"));
        candidatePaths.Add(Path.Combine(_environment.ContentRootPath, "..", "Xds.Approval.web", "src", "assets", "hero.png"));

        return ReadFirstValidImage(candidatePaths, "PDF logo");
    }

    private static string BuildDocumentNumber(PaymentRequest request)
    {
        return $"REF{request.Id:D5}";
    }

    private static string BuildVerificationCode(PaymentRequest request, Approval? approval, FinanceProcessing? financeProcessing)
    {
        var verificationPayload = string.Join("|",
            request.Id,
            request.CreatedAt.ToString("O"),
            request.RequestedBy,
            request.Amount,
            request.Status,
            approval?.ApprovedBy,
            approval?.ApprovedAt.ToString("O"),
            financeProcessing?.PreparedBy,
            financeProcessing?.PreparedAt.ToString("O"),
            financeProcessing?.AuthorizedBy,
            financeProcessing?.AuthorizedAt?.ToString("O"),
            financeProcessing?.CompanyName,
            financeProcessing?.RecipientName);

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(verificationPayload));
        return Convert.ToHexString(hashBytes)[..12];
    }

    private static string ToAmountInWords(decimal amount, string currency)
    {
        var wholeNumber = (long)Math.Floor(amount);
        var cents = (int)((amount - wholeNumber) * 100);
        var currencyLabel = currency.ToUpperInvariant() switch
        {
            "USD" => "United States Dollars",
            "EUR" => "Euros",
            "GBP" => "Pounds Sterling",
            _ => "Ghana Cedis"
        };

        var wholeWords = wholeNumber == 0 ? "Zero" : NumberToWords(wholeNumber);
        var centsWords = cents > 0 ? $" and {NumberToWords(cents)} Cents" : string.Empty;
        return $"{wholeWords} {currencyLabel}{centsWords}";
    }

    private static string NumberToWords(long number)
    {
        if (number == 0) return "Zero";
        if (number < 0) return $"Minus {NumberToWords(Math.Abs(number))}";

        var parts = new List<string>();

        void AppendChunk(long value, string scale)
        {
            if (value <= 0) return;
            parts.Add($"{NumberToWordsUnderOneThousand((int)value)} {scale}".Trim());
        }

        AppendChunk(number / 1_000_000_000, "Billion");
        number %= 1_000_000_000;
        AppendChunk(number / 1_000_000, "Million");
        number %= 1_000_000;
        AppendChunk(number / 1_000, "Thousand");
        number %= 1_000;

        if (number > 0)
        {
            parts.Add(NumberToWordsUnderOneThousand((int)number));
        }

        return string.Join(" ", parts.Where(part => !string.IsNullOrWhiteSpace(part)));
    }

    private static string NumberToWordsUnderOneThousand(int number)
    {
        string[] units =
        [
            "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"
        ];

        string[] tens =
        [
            string.Empty, string.Empty, "Twenty", "Thirty", "Forty", "Fifty",
            "Sixty", "Seventy", "Eighty", "Ninety"
        ];

        if (number < 20) return units[number];
        if (number < 100)
        {
            return tens[number / 10] + (number % 10 == 0 ? string.Empty : $" {units[number % 10]}");
        }

        return $"{units[number / 100]} Hundred" +
               (number % 100 == 0 ? string.Empty : $" {NumberToWordsUnderOneThousand(number % 100)}");
    }

    private static IContainer CellStyle(IContainer container)
    {
        return container
            .Border(1)
            .BorderColor(Colors.Grey.Lighten1)
            .PaddingVertical(6)
            .PaddingHorizontal(8)
            .Background(Colors.Grey.Lighten5);
    }

    private static IContainer DataCellStyle(IContainer container)
    {
        return container
            .Border(1)
            .BorderColor(Colors.Grey.Lighten1)
            .PaddingVertical(8)
            .PaddingHorizontal(8);
    }

    private static void ComposeSignatureBlock(IContainer container, string title, string signerName, DateTime? signedAt, byte[]? signatureBytes)
    {
        container.Column(column =>
        {
            column.Spacing(2);
            column.Item().Text(title).SemiBold().FontSize(11);
            column.Item().Height(40).BorderBottom(1).BorderColor(Colors.Grey.Lighten1).AlignBottom().AlignCenter().PaddingBottom(1).Element(imageContainer =>
            {
                if (signatureBytes is not null)
                {
                    imageContainer.Image(signatureBytes).FitHeight();
                }
            });
            column.Item().Text(string.IsNullOrWhiteSpace(signerName) ? "-" : signerName).FontSize(10);
            column.Item().Text(signedAt.HasValue ? signedAt.Value.ToString("dd/MM/yyyy HH:mm") : "-").FontSize(9).FontColor(Colors.Grey.Darken1);
        });
    }

    private static string ToDisplayName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "-";
        }

        return System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(value.Trim().ToLowerInvariant());
    }

    private byte[]? LoadSignatureImage(string role)
    {
        var configuredPath = _configuration[$"PdfTemplate:SignaturePaths:{role}"];
        var candidatePaths = new List<string>();

        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            candidatePaths.Add(Path.IsPathRooted(configuredPath)
                ? configuredPath
                : Path.Combine(_environment.ContentRootPath, configuredPath));
        }

        if (string.Equals(role, "HeadOfFinance", StringComparison.OrdinalIgnoreCase))
        {
            candidatePaths.Add(Path.Combine(_environment.ContentRootPath, "logo", "signatures", "finance-signature.png"));
            candidatePaths.Add(Path.Combine(_environment.ContentRootPath, "logo", "signatures", "head-of-finance-signature.png"));
        }

        if (string.Equals(role, "CEO", StringComparison.OrdinalIgnoreCase))
        {
            candidatePaths.Add(Path.Combine(_environment.ContentRootPath, "logo", "signatures", "ceo-signature.png"));
        }

        return ReadFirstValidImage(candidatePaths, $"{role} signature");
    }

    private byte[]? ReadFirstValidImage(IEnumerable<string> candidatePaths, string assetName)
    {
        foreach (var path in candidatePaths.Where(path => !string.IsNullOrWhiteSpace(path)).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!File.Exists(path))
            {
                continue;
            }

            try
            {
                var bytes = File.ReadAllBytes(path);
                if (IsPng(bytes) || IsJpeg(bytes))
                {
                    return bytes;
                }

                _logger.LogWarning("{AssetName} exists but is not a valid PNG or JPEG: {AssetPath}", assetName, path);
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                _logger.LogWarning(exception, "Unable to read {AssetName} from {AssetPath}.", assetName, path);
            }
        }

        _logger.LogWarning("{AssetName} was not found or was not a valid PNG/JPEG. The PDF will be generated without it.", assetName);
        return null;
    }

    private static bool IsPng(byte[] bytes)
    {
        return bytes.Length > 8
            && bytes[0] == 0x89
            && bytes[1] == 0x50
            && bytes[2] == 0x4E
            && bytes[3] == 0x47
            && bytes[4] == 0x0D
            && bytes[5] == 0x0A
            && bytes[6] == 0x1A
            && bytes[7] == 0x0A;
    }

    private static bool IsJpeg(byte[] bytes)
    {
        return bytes.Length > 3
            && bytes[0] == 0xFF
            && bytes[1] == 0xD8
            && bytes[^2] == 0xFF
            && bytes[^1] == 0xD9;
    }

    private static void ComposeSection(IContainer container, string title, Action<ColumnDescriptor> content)
    {
        container.Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.White)
            .Padding(12).Column(column =>
            {
                column.Spacing(8);
                column.Item().Text(title).Bold().FontSize(12).FontColor(Colors.Blue.Darken3);
                column.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                column.Item().Column(content);
            });
    }

    private static void ComposeSummaryRow(ColumnDescriptor column, string label, string value)
    {
        column.Item().PaddingVertical(6).Row(row =>
        {
            row.ConstantItem(140).Text(label).SemiBold();
            row.RelativeItem().Text(value);
        });

        column.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten3);
    }

    private static void ComposeStamp(IContainer container, string text, bool isActive, string color)
    {
        string borderColor = isActive ? color : Colors.Grey.Lighten1;
        string backgroundColor = isActive ? Colors.White : Colors.Grey.Lighten4;
        string fontColor = isActive ? color : Colors.Grey.Darken1;

        container.Border(2)
            .BorderColor(borderColor)
            .Background(backgroundColor)
            .PaddingHorizontal(12)
            .PaddingVertical(8)
            .Rotate(-8)
            .Text(text)
            .Bold()
            .FontSize(12)
            .FontColor(fontColor);
    }

    private void SaveArchivedPdf(int requestId, byte[] pdfBytes, string documentNumber)
    {
        var filePath = BuildArchivedPdfPath(requestId, documentNumber);
        var requestFolder = Path.GetDirectoryName(filePath)!;
        Directory.CreateDirectory(requestFolder);
        File.WriteAllBytes(filePath, pdfBytes);

        var versionedFilePath = BuildArchivedPdfVersionPath(requestId, documentNumber, DateTime.UtcNow);
        var historyFolder = Path.GetDirectoryName(versionedFilePath)!;
        Directory.CreateDirectory(historyFolder);
        File.WriteAllBytes(versionedFilePath, pdfBytes);
    }

    private async Task<ServiceResult<PaymentRequest>> GetAccessibleProcessedRequestAsync(int requestId, int currentUserId, string currentUserRole)
    {
        var request = await _context.PaymentRequests
            .Include(paymentRequest => paymentRequest.Attachments)
            .FirstOrDefaultAsync(paymentRequest => paymentRequest.Id == requestId);

        if (request is null)
        {
            return ServiceResult<PaymentRequest>.Fail(ServiceResultType.NotFound, "Payment request not found.");
        }

        var canAccess = currentUserRole switch
        {
            "User" => request.RequestedBy == currentUserId,
            "CEO" => true,
            "Finance" => true,
            "HeadOfFinance" => true,
            _ => false
        };

        if (!canAccess)
        {
            return ServiceResult<PaymentRequest>.Fail(ServiceResultType.Conflict, "You are not allowed to access this document.");
        }

        if (request.Status is not ("FinancePrepared" or "FinanceAuthorized" or "Approved"))
        {
            return ServiceResult<PaymentRequest>.Fail(ServiceResultType.Conflict, "The PDF document is available after Finance prepares the PV.");
        }

        return ServiceResult<PaymentRequest>.Ok(request);
    }

    private async Task<ServiceResult<PaymentRequest>> GetAccessibleRequestForAuditAsync(int requestId, int currentUserId, string currentUserRole)
    {
        var request = await _context.PaymentRequests
            .FirstOrDefaultAsync(paymentRequest => paymentRequest.Id == requestId);

        if (request is null)
        {
            return ServiceResult<PaymentRequest>.Fail(ServiceResultType.NotFound, "Payment request not found.");
        }

        var canAccess = currentUserRole switch
        {
            "User" => request.RequestedBy == currentUserId,
            "CEO" => true,
            "Finance" => true,
            "HeadOfFinance" => true,
            _ => false
        };

        if (!canAccess)
        {
            return ServiceResult<PaymentRequest>.Fail(ServiceResultType.Conflict, "You are not allowed to access audit logs for this payment request.");
        }

        return ServiceResult<PaymentRequest>.Ok(request);
    }

    private string BuildArchivedPdfPath(int requestId, string documentNumber)
    {
        var archiveRoot = ResolveArchiveRoot();
        var safeDocumentNumber = SanitizeFileName(documentNumber);
        return Path.Combine(archiveRoot, "payment-requests", requestId.ToString(), $"{safeDocumentNumber}.pdf");
    }

    private string BuildArchivedPdfVersionPath(int requestId, string documentNumber, DateTime generatedAtUtc)
    {
        var archiveRoot = ResolveArchiveRoot();
        var safeDocumentNumber = SanitizeFileName(documentNumber);
        var timestamp = generatedAtUtc.ToString("yyyyMMdd-HHmmss");
        return Path.Combine(archiveRoot, "payment-requests", requestId.ToString(), "history", $"{safeDocumentNumber}-{timestamp}.pdf");
    }

    private string ResolveArchiveRoot()
    {
        var configuredArchiveFolder = _configuration["PdfTemplate:ArchiveFolder"];
        return string.IsNullOrWhiteSpace(configuredArchiveFolder)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot", "documents")
            : Path.IsPathRooted(configuredArchiveFolder)
                ? configuredArchiveFolder
                : Path.Combine(_environment.ContentRootPath, configuredArchiveFolder);
    }

    private static string SanitizeFileName(string value)
    {
        return string.Concat(value.Select(character =>
            Path.GetInvalidFileNameChars().Contains(character) ? '-' : character));
    }

    private static string? NormalizeGhanaPhoneNumber(string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return null;
        }

        var normalizedDigits = new string(phoneNumber.Where(char.IsDigit).ToArray());
        return normalizedDigits.Length == 10 ? normalizedDigits : null;
    }

    private static bool TryExtractRequestIdFromDocumentNumber(string documentNumber, out int requestId)
    {
        requestId = 0;
        var normalized = documentNumber.Replace(" ", string.Empty, StringComparison.OrdinalIgnoreCase);
        if (!normalized.StartsWith("REF", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return int.TryParse(normalized[3..], out requestId);
    }
}
