const response = await fetch("http://localhost:3000/api/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "bobby@workingdevshero.com",
    minutes: 5,
    task: "Test task: Write a hello world script in TypeScript"
  })
});
console.log("Response:", await response.json());
