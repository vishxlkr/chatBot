import Groq from "groq-sdk";
import { configDotenv } from "dotenv";
import readline from "node:readline/promises";

import { tavily } from "@tavily/core";

configDotenv({ quiet: true });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ api_key: process.env.TAVILY_API_KEY });

export async function main() {
   const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
   });

   const messages = [
      {
         role: "system",
         content: `You are a smart personal assistant who answer the asked question. 
            You have access to following tools.
            1. webSearch({query} : {query: string}) // search the latest information and realtime data on the internet.
            current date and time : ${new Date().toUTCString()}
            `,
      },
      // {
      //    role: "user",
      //    content: `when was iphone 12 launched?`,
      // },
   ];

   while (true) {
      const question = await rl.question("You: ");
      if (question === "bye") {
         break;
      }

      messages.push({
         role: "user",
         content: question,
      });

      while (true) {
         const response = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            //   top_p: 1,
            //   stop: "13",
            //   max_completion_tokens: 1000,
            //   frequency_penalty:1,
            //   presence_penalty:1
            // response_format: {
            //    type: "json_object",
            // },
            tools: [
               {
                  type: "function",
                  function: {
                     name: "webSearch",
                     description:
                        "Search the latest information and realtime data on the internet",
                     parameters: {
                        // JSON Schema object
                        type: "object",
                        properties: {
                           query: {
                              type: "string",
                              description:
                                 "The search query to perform search on.",
                           },
                        },
                        required: ["query"],
                     },
                  },
               },
            ],
            tool_choice: "auto",
         });

         messages.push(response.choices[0].message);

         // console.log(JSON.stringify(response, null, 2));

         const toolCalls = response.choices[0].message.tool_calls;

         if (!toolCalls) {
            console.log(`Assistant : ${response.choices[0].message.content}`);
            break;
         }

         // console.log(toolCall);

         // run all the tools
         for (const tool of toolCalls) {
            // console.log("tool : ", tool);
            const functionName = tool.function.name;
            const functionArgs = tool.function.arguments;

            if (functionName === "webSearch") {
               const toolResult = await webSearch(JSON.parse(functionArgs));
               // console.log("Tool Result : ", toolResult);

               messages.push({
                  tool_call_id: tool.id,
                  role: "tool",
                  name: functionName,
                  content: toolResult,
               });
            }
         }

         // const response2 = await groq.chat.completions.create({
         //    messages: messages,
         //    model: "llama-3.3-70b-versatile",
         //    temperature: 0,
         // });

         // console.log(response2.choices[0].message.content);
         // break;
      }
   }
   rl.close();
}

async function webSearch({ query }) {
   // Herer we will do tavily api call
   console.log("Calling webSearch...");

   const response = await tvly.search(query);

   const finalResult = response.results
      .map((result) => result.content)
      .join("\n\n");

   return finalResult;
}

main();
