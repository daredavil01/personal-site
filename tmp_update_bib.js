const fs = require('fs');
let file = fs.readFileSync('src/data/sports.js', 'utf-8');

const bibs = {
  '"NDA Marathon 2023"': "10214",
  '"Pune City Marathon 2024"': "22231",
  '"AMIBOLT 2024"': "1210",
  '"ANP Run 2024"': "21065",
  '"Vrukshathon 2024"': "2392",
  '"NMDC Hyderabad Marathon 2024"': "25768",
  '"Satara Half Hill Marathon 2024"': "25026",
  '"Apala Pune Marathon 2024"': "22136",
  '"CME Marathon 2024"': "21632",
  '"Tata Mumbai Marathon 2025"': "9125",
  '"Milit Lake View HM 2025"': "2119",
  '"Tata Ultra Marathon, Lonavala 2025"': "36056",
  '"Vrukshathon 2025"': "21093",
  '"Satara Half Hill Marathon 2025"': "26007",
  '"NMDC Hyderabad Marathon 2025"': "N/A",
  '"Pune International Marathon 2025"': "610661",
  '"Tata Mumbai Marathon 2026"': "9813",
  '"IPA Neerathon 2026"': "10280",
  '"Tata Ultra Marathon 2026"': "50097",
};

let out = "";
let currentBib = null;
const lines = file.split('\n');
for (let i = 0; i < lines.length; i++) {
  out += lines[i];
  if (i < lines.length - 1) out += '\n';

  const titleMatch = lines[i].match(/title:\s*(".*?")/);
  if (titleMatch) {
    currentBib = bibs[titleMatch[1]];
  }
  
  // The line has timeCertificateLink and next line contains the actual link URL
  if (lines[i].includes('timeCertificateLink:') && !lines[i].includes('",')) {
     continue; // We wait for the next line
  } 
  
  if (currentBib && lines[i].trim().endsWith('",') && (lines[i-1].includes('timeCertificateLink:') || lines[i].includes('timeCertificateLink:'))) {
     out += `    bibNumber: "${currentBib}",\n`;
     currentBib = null;
  }
}

fs.writeFileSync('src/data/sports.js', out);
console.log("Updated sports.js successfully.");
