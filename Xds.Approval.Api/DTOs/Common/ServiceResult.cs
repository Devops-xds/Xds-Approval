namespace Xds.Approval.Api.DTOs.Common
{
    public enum ServiceResultType
    {
        Success,
        NotFound,
        Conflict,
        ValidationError
    }

    public class ServiceResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public ServiceResultType ResultType { get; set; }

        public static ServiceResult Ok(string message) => new()
        {
            Success = true,
            Message = message,
            ResultType = ServiceResultType.Success
        };

        public static ServiceResult Fail(ServiceResultType resultType, string message) => new()
        {
            Success = false,
            Message = message,
            ResultType = resultType
        };
    }

    public class ServiceResult<T> : ServiceResult
    {
        public T? Data { get; set; }

        public static ServiceResult<T> Ok(T data, string message = "") => new()
        {
            Success = true,
            Data = data,
            Message = message,
            ResultType = ServiceResultType.Success
        };

        public new static ServiceResult<T> Fail(ServiceResultType resultType, string message) => new()
        {
            Success = false,
            Message = message,
            ResultType = resultType
        };
    }
}
