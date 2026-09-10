export function getCsrfToken() {
  const match = document.cookie.match(
    /(?:^|;\s*)vertofi_csrf_token=([^;]+)/
  );

  return match ? decodeURIComponent(match[1]) : "";
}