const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/message', (req, res) => {
  res.json({
    from: 'Joyanta Sarker Joy',
    dear: 'Dear Pakhi,',
    body:
      "Sorry for the late. I didn't had time — you know how much busy I am. " +
      "But always keep that in mind that I love you.\n\n" +
      "Every quiet moment of my day finds its way back to you. " +
      "In a world full of noise, you are the one melody my heart never tires of. " +
      "Distance and busy days may steal my hours, but they can never steal the place " +
      "you hold in me — that is yours, always.\n\n" +
      "Until I see you again, keep smiling. That smile is my favorite view in the whole world.",
    signature: 'Yours — JSJ',
  });
});

app.listen(PORT, () => {
  console.log(`Letter running at http://localhost:${PORT}`);
});
