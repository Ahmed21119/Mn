// db.js
const db = new Dexie('sijilatDatabase');

db.version(2).stores({
  records: '++id, personName, nationalIdPassportNum, entryDate, frontImageBase64, backImageBase64',
});
db.version(1).stores({
  records: '++id, personName, nationalIdPassportNum, entryDate',
});

db.open().catch(err => console.error('Failed to open db: ' + (err.stack || err)));