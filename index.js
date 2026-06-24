import http from "node:http";

// Render が指定するポート番号、もしくは 8888 を使う設定じゃ
const PORT = process.env.PORT || 8888;

const server = http.createServer((req, res) => {
  // 日本語が文字化けしないように設定するぞ
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  if (req.url === "/") {
    res.writeHead(200);
    res.end("こんにちは！新しい my-app へようこそ。");
  } else {
    res.writeHead(404);
    res.end("ページが見つかりませぬ。");
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
