// script responsible for setting the API token in the .env file
// Usage: npm run start-set-token
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the API token: ', (token) => {
  rl.close();
  fs.writeFileSync('.env', `REACT_APP_API_TOKEN=${token}`);
  console.log('.env file updated.');
});
