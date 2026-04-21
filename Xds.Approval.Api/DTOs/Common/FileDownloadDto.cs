namespace Xds.Approval.Api.DTOs.Common
{
    public class FileDownloadDto
    {
        public byte[] Content { get; set; } = [];
        public string ContentType { get; set; } = "application/octet-stream";
        public string FileName { get; set; } = string.Empty;
    }
}
