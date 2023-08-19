// # # Get the token input from the user
// # $token = Read-Host "Enter the API token"

// # # Create or update the .env file with the entered token
// # Set-Content -Path ".env" -Value "REACT_APP_API_TOKEN=$token"

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
