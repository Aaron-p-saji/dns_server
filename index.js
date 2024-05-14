const { createSocket } = require("node:dgram");
const { AUTHORITATIVE_ANSWER, decode, encode } = require("dns-packet");
const { createClient } = require("redis");
const dns = require("node:dns");
require("dotenv/config");
let ips;

async function main() {
  const server = createSocket("udp4");
  const client = await createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_SOCKET,
      port: 11340,
    },
  })
    .on("error", (err) => console.log("Redis Client Error ❌", err))
    .on("connect", () => {
      console.log("\x1b[36m%s\x1b[0m", "Connection to the DB Successfull ✅");
    })
    .connect();

  server.on("message", async (msg, rinfo) => {
    const IncMsg = decode(msg);
    const domain = IncMsg.questions[0].name;
    console.log(domain.toString());

    try {
      // Await the Promise to get the actual IP from Redis
      let ipFromDB = await client.LRANGE(domain, -100, 100);

      if (ipFromDB.length !== 0) {
        console.log("Response From DB");
        const uniqueIps = new Set(ipFromDB);
        const ans = encode({
          type: "response",
          id: IncMsg.id,
          flags: AUTHORITATIVE_ANSWER,
          questions: IncMsg,
          additionals: IncMsg.additionals,
          answers: Array.from(uniqueIps).map((value) => ({
            type: "A",
            class: "IN",
            name: IncMsg.questions[0].name,
            data: value, // Single IP address from the set
          })),
        });
        server.send(ans, rinfo.port, rinfo.address);
        console.log("server response send ✅");
      } else {
        try {
          console.log("Fetching from Alternate DNS");
          const dnsResponse = await resolveDNS(domain).then(() => {
            const uniqueIps = new Set(ipFromDB);
            const ans = encode({
              type: "response",
              id: IncMsg.id,
              flags: AUTHORITATIVE_ANSWER,
              questions: IncMsg,
              additionals: IncMsg.additionals,
              answers: Array.from(uniqueIps).map((value) => ({
                type: "A",
                class: "IN",
                name: IncMsg.questions[0].name,
                data: value, // Single IP address from the set
              })),
            });
            server.send(ans, rinfo.port, rinfo.address);
            console.log("server response send ✅");
          });
        } catch (error) {
          // If resolution fails, return an error response or a default IP (e.g., "0.0.0.0")
          console.error(`DNS resolution error for ${domain}: ${error}`);
          ipFromDB = "0.0.0.0"; // Or your preferred error handling
        }
      }
    } catch (error) {
      console.error(`Redis Error: ${error}`);
      // Handle Redis errors gracefully (e.g., return an error DNS response)
    }
  });

  async function resolveDNS(domain) {
    try {
      return dns.resolve4(domain, async (err, addresses) => {
        if (err) throw err;

        ips = addresses.map(async (addr, index) => {
          await client.lPush(domain, addr);
        });
      });
    } catch (error) {
      console.error(`DNS D resolution error for ${domain}: ${error}`);
      // Handle the error appropriately (e.g., return a default IP)
      return "0.0.0.0"; // Or a more specific error code
    }
  }

  server.bind(53, () => {
    console.log("BenZene's DNS is running on Port 53 ⚙️");
  });
}

main();
