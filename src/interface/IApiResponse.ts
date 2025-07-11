interface ApiResponse<T> {
  data: {
    success?: boolean;
    data: T;
    message?: string
  };
}