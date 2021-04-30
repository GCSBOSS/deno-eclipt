cls
deno test --fail-fast --coverage=coverage --unstable --allow-env
deno coverage --unstable coverage
rm coverage/*
