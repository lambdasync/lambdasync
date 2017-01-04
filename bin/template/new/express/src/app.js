'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(awsServerlessExpressMiddleware.eventContext());

const getUser = (userId) => users.find(u => u.id === parseInt(userId));
const getUserIndex = (userId) => users.findIndex(u => u.id === parseInt(userId));

// Ephemeral in-memory data store
const users = [{
    id: 1,
    name: 'Joe'
}, {
    id: 2,
    name: 'Jane'
}];
let userIdCounter = users.length;

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/index.html`);
});

app.get('/users/:userId', (req, res) => {
    const user = getUser(req.params.userId);

    if (!user) return res.status(404).json({});

    return res.json(user);
});

module.exports = app;
