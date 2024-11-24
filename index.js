const http = require("http");
const https = require("https");
const fs = require("fs");
const url = require("url");

// 常量定义
const PORT = 5500;
const KNOWLEDGE_ID = ""; // 替换为实际的知识库ID
const TOKEN = ""; // 替换为实际的token

// 解析输入函数
function parseInput(message) {
  return JSON.stringify({
    model: "glm-4-long",
    stream: true,
    temperature: 0.5,
    top_p: 0.5,
    tools: [
      {
        type: "retrieval",
        retrieval: {
          knowledge_id: KNOWLEDGE_ID,
        },
      },
    ],
    messages: [
      {
        role: "system",
        content:
          "你叫小艺，是销售人员的教练，能够帮助销售人员成长，擅长分析销售行业的问题，回答问题生动形象且认真仔细。",
      },
      {
        role: "user",
        content: message,
      },
    ],
  });
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === "/send" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const { message } = JSON.parse(body);

        if (!message) {
          res.writeHead(400);
          res.end("Message is required");
          return;
        }

        // 设置SSE响应头
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        // 准备API请求选项
        const options = {
          hostname: "open.bigmodel.cn",
          path: "/api/paas/v4/chat/completions",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TOKEN}`,
          },
        };

        // 发送API请求
        const apiReq = https.request(options, (apiRes) => {
          apiRes.on("data", (chunk) => {
            const lines = chunk.toString().split("\n");

            lines.forEach((line) => {
              if (line.trim()) {
                try {
                  const cleanData = line.replace("data:", "").trim();
                  const jsonData = JSON.parse(cleanData);

                  if (jsonData.choices?.[0]?.delta?.content) {
                    res.write(jsonData.choices[0].delta.content);
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            });
          });

          apiRes.on("end", () => {
            res.end();
          });
        });

        apiReq.on("error", (error) => {
          console.error("API请求错误:", error);
          res.writeHead(500);
          res.end("Internal Server Error");
        });

        // 发送请求数据
        apiReq.write(parseInput(message));
        apiReq.end();
      } catch (error) {
        console.error("请求处理错误:", error);
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });
  } else if (parsedUrl.pathname === "/") {
    // 返回index.html
    fs.readFile("index.html", (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading index.html");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(content);
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
