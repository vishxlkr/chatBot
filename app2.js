import Groq from "groq-sdk";
import { configDotenv } from "dotenv";
import { tavily } from "@tavily/core";

configDotenv({ quiet: true });

const groq = new Groq({
   apiKey: process.env.GROQ_API_KEY,
});

const tvly = tavily({
   api_key: process.env.TAVILY_API_KEY,
});

async function webSearch({ query }) {
   console.log("Calling webSearch...");

   const response = await tvly.search(query);

   return response.results
      .map((result) => result.content)
      .filter(Boolean)
      .join("\n\n");
}

async function main() {
   const messages = [
      {
         role: "system",
         content: `
            You are a smart personal assistant.
            You can use tools when needed.

            Available tools:
            1. webSearch({ query })
            `,
      },
      {
         role: "user",
         content: "when was iphone 12 launched?",
      },
   ];

   while (true) {
      const response = await groq.chat.completions.create({
         model: "llama-3.3-70b-versatile",
         messages: messages,
         temperature: 0,
         tools: [
            {
               type: "function",
               function: {
                  name: "webSearch",
                  description: "Search the latest information on the internet",
                  parameters: {
                     type: "object",
                     properties: {
                        query: { type: "string" },
                     },
                     required: ["query"],
                  },
               },
            },
         ],
         tool_choice: "auto",
      });

      const message = response.choices[0].message;
      messages.push(message);

      // ✅ FINAL ANSWER (NO TOOL CALL)
      if (!message.tool_calls) {
         console.log(`Assistant : ${message.content}`);
         break;
      }

      // ✅ TOOL CALL PRESENT → EXECUTE
      for (const tool of message.tool_calls) {
         if (tool.function.name === "webSearch") {
            const toolResult = await webSearch(
               JSON.parse(tool.function.arguments),
            );

            messages.push({
               role: "tool",
               tool_call_id: tool.id,
               name: "webSearch",
               content: toolResult,
            });
         }
      }
   }
}

main();


git quickgit quickgit quick