async function test() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
  );

  const data = await res.json();
  console.log(data);
}

test();