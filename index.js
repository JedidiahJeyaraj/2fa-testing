const express = require('express');
const speakeasy = require('speakeasy');
const uuid = require('uuid');
const { JsonDB, Config } = require('node-json-db');

const app = express();
app.use(express.json());

const db = new JsonDB(new Config('my-db', true, true, '/'));

app.get('/api/healthcheck', async (req, res) => {
  res.json({
    msg: 'up',
  });
});

// Register user and create temp secret

app.post('/api/register', async (req, res) => {
  const id = uuid.v4();
  const { email, name } = req.body;
  try {
    const path = `/user/${email}`;
    try {
      const user = await db.getData(path);
      const { base32: secret } = user.secret;
      res.json({ secret: secret });
    } catch (error) {
      const secret = speakeasy.generateSecret();
      await db.push(path, { id, secret, data: { email, name } });
      res.json({ secret: secret.base32 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error creating user' });
  }
});

// Validate token

app.post('/api/validate', async (req, res) => {
  const { token, email } = req.body;
  try {
    const path = `/user/${email}`;
    const user = await db.getData(path);
    const { base32: secret } = user.secret;
    const tokenValidate = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (tokenValidate) {
      res.json({ validated: true });
    } else {
      res.json({ validated: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error finding user' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
