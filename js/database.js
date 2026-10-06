/** Reutiliza a conexão IDB e fecha quando outra aba precisa atualizar o banco. */
export function createDatabase(name, version, upgrade) {
  let connection = null;

  function open() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const req = indexedDB.open(name, version);
      req.onupgradeneeded = () => upgrade(req.result);
      req.onerror = () => {
        connection = null;
        reject(req.error);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          connection = null;
          db.close();
        };
        db.onclose = () => { connection = null; };
        resolve(db);
      };
    });
    return connection;
  }

  // fn dispara requests sincronamente, sem await que permita auto-commit.
  function run(stores, mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let primary = null;
      tx.oncomplete = () => resolve(primary ? primary.result : undefined);
      tx.onerror = () => reject(tx.error || new Error("IndexedDB error"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB abort"));
      try {
        primary = fn(tx) || null;
      } catch (err) {
        tx.abort();
        reject(err);
      }
    }));
  }

  return { run };
}
