cls
deno test --fail-fast --coverage=coverage --unstable
deno coverage --unstable coverage
rm coverage/*
