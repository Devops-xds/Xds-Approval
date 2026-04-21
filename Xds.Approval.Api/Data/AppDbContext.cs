using Microsoft.EntityFrameworkCore;
using Xds.Approval.Api.Models;

public class AppDbContext : DbContext
{
    public DbSet<AuthUser> AuthUsers { get; set; }
    public DbSet<PaymentRequest> PaymentRequests { get; set; }
    public DbSet<Attachment> Attachments { get; set; }
    public DbSet<Approval> Approvals { get; set; }
    public DbSet<FinanceProcessing> FinanceProcessings { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AuthUser>(entity =>
        {
            entity.ToTable("AuthUsers");
            entity.HasKey(user => user.Id);
            entity.HasIndex(user => user.Username).IsUnique();
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.Username).HasMaxLength(100).IsRequired();
            entity.Property(user => user.Email).HasMaxLength(180);
            entity.Property(user => user.FullName).HasMaxLength(150);
            entity.Property(user => user.Department).HasMaxLength(100);
            entity.Property(user => user.PasswordHash).IsRequired();
            entity.Property(user => user.Role).HasMaxLength(50).IsRequired();
        });

        modelBuilder.Entity<Attachment>(entity =>
        {
            entity.ToTable("Attachments");
            entity.HasKey(attachment => attachment.Id);
            entity.Property(attachment => attachment.FileName).HasMaxLength(255).IsRequired();
            entity.Property(attachment => attachment.ContentType).HasMaxLength(255).IsRequired();
            entity.Property(attachment => attachment.FilePath).HasMaxLength(500).IsRequired();
            entity.HasOne(attachment => attachment.PaymentRequest)
                .WithMany(request => request.Attachments)
                .HasForeignKey(attachment => attachment.PaymentRequestId);
        });

        modelBuilder.Entity<PaymentRequest>(entity =>
        {
            entity.Property(request => request.Amount).HasPrecision(18, 2);
            entity.Property(request => request.Currency).HasMaxLength(10);
            entity.Property(request => request.PaymentType).HasMaxLength(50);
        });

        modelBuilder.Entity<FinanceProcessing>(entity =>
        {
            entity.Property(processing => processing.CompanyName).HasMaxLength(255);
            entity.Property(processing => processing.RecipientName).HasMaxLength(255);
            entity.Property(processing => processing.RecipientAddress).HasMaxLength(500);
            entity.Property(processing => processing.RecipientTelephone).HasMaxLength(50);
            entity.Property(processing => processing.Status).HasMaxLength(50);
        });

        modelBuilder.Entity<Approval>(entity =>
        {
            entity.Property(approval => approval.Stage).HasMaxLength(50);
            entity.Property(approval => approval.Status).HasMaxLength(50);
        });
    }
}
