import * as fs from "fs";

const VENICE_API_KEY = "3NwhkgKvnJnkkIkZfviqejC_QLtXE7ZDxlBiyLcm2M";

async function generateImage() {
  console.log("Generating hero image for WorkingDevsHero...");

  const response = await fetch("https://api.venice.ai/api/v1/image/generate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${VENICE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "venice-sd35",
      prompt: "A futuristic digital workspace with AI code floating in holographic displays, purple and cyan color scheme, professional tech company branding, abstract geometric patterns, modern minimalist style, high quality digital art",
      width: 1024,
      height: 576,
      steps: 25,
    }),
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));

  if (data.images && data.images.length > 0) {
    // Save base64 image to file
    const base64Data = data.images[0].replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const outputPath = "/home/claude/Desktop/workingdevshero/public/images/hero.png";

    // Ensure directory exists
    fs.mkdirSync("/home/claude/Desktop/workingdevshero/public/images", { recursive: true });
    fs.writeFileSync(outputPath, buffer);
    console.log("Image saved to:", outputPath);
  }
}

generateImage().catch(console.error);
