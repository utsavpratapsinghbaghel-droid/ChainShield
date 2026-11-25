'use strict';

const hana = require('@sap/hana-client');

const connection = hana.createConnection();

const config = {
    host: process.env.HANA_HOST,
    port: Number(process.env.HANA_PORT || 443),
    user: process.env.HANA_USER,
    password: process.env.HANA_PASSWORD
};

connection.connect(config, (err) => {
    if (err) {
        console.error('HANA connection failed:', err);
        return;
    }

    console.log('Connected to SAP HANA Cloud!');

    connection.exec(
        'SELECT CURRENT_USER FROM DUMMY',
        (err, result) => {
            if (err) {
                console.error('Query failed:', err);
            } else {
                console.log('Query result:', result);
            }

            connection.disconnect();
        }
    );
});