'use strict';

const hana = require('@sap/hana-client');

let connection;
let connectPromise;

function getConnection() {
    if (connectPromise) return connectPromise;

    connection = hana.createConnection();

    const config = {
        host: process.env.HANA_HOST,
        port: Number(process.env.HANA_PORT || 443),
        user: process.env.HANA_USER,
        password: process.env.HANA_PASSWORD,
        authenticationMethods: ['password'],
    };

    connectPromise = new Promise((resolve, reject) => {
        connection.connect(config, (err) => {
            if (err) {
                connectPromise = null;
                connection = null;
                reject(err);
                return;
            }
            resolve(connection);
        });
    });

    return connectPromise;
}

async function exec(sql, params = []) {
    const conn = await getConnection();

    return new Promise((resolve, reject) => {
        conn.exec(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

async function initialize() {
    try {
        await exec(`
            CREATE COLUMN TABLE CHAINSHIELD.APP_STATE (
                ID NVARCHAR(50) PRIMARY KEY,
                STATE NCLOB,
                UPDATED_AT TIMESTAMP
            )
        `);
        console.log('APP_STATE table created.');
    } catch (err) {
        if (err.message && err.message.toLowerCase().includes('duplicate table name')) {
            console.log('APP_STATE table already exists.');
        } else {
            throw err;
        }
    }
}

async function loadState() {
    const result = await exec(
        'SELECT STATE FROM CHAINSHIELD.APP_STATE WHERE ID = ?',
        ['MAIN']
    );

    if (!result || result.length === 0) {
        return null;
    }

    const value = result[0].STATE;

    if (!value) return null;

    return typeof value === 'string' ? JSON.parse(value) : value;
}

async function saveState(state) {
    const json = JSON.stringify(state);

    await exec(
        `UPSERT CHAINSHIELD.APP_STATE
         (ID, STATE, UPDATED_AT)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        ['MAIN', json]
    );
}

async function close() {
    if (!connection || !connectPromise) return;

    try {
        await connectPromise;

        await new Promise((resolve, reject) => {
            connection.disconnect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    } finally {
        connection = null;
        connectPromise = null;
    }
}

module.exports = {
    getConnection,
    exec,
    initialize,
    loadState,
    saveState,
    close
};