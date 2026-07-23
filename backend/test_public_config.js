async function main() {
  console.log('Testing 127.0.0.1:3001/config/google...');
  const res = await fetch('http://127.0.0.1:3001/config/google', { signal: AbortSignal.timeout(5000) });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
