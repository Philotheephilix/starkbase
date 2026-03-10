import { useState, type ReactNode } from "react"

const tabs = [
  { label: "Auth", key: "auth" },
  { label: "Tokens", key: "tokens" },
  { label: "Blobs", key: "blobs" },
  { label: "Schemas", key: "schemas" },
] as const

// Simple syntax highlighter for TypeScript-like code
function highlightCode(code: string): ReactNode[] {
  const lines = code.split("\n")
  return lines.map((line, i) => {
    // Comment lines
    if (line.trimStart().startsWith("//")) {
      return <div key={i}><span className="text-white/30 italic">{line}</span></div>
    }

    // Tokenize the line
    const tokens: ReactNode[] = []
    // Match keywords, strings, numbers, property access, and the rest
    const regex = /(\/\/.*$)|('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)|(\b(?:import|from|const|await|new|let|var|return|export|async|function|type)\b)|(\b\d[\d_]*n?\b)|(\b(?:true|false|null|undefined)\b)|(\.(?:auth|tokens|blobs|nfts|schemas|events|log|register|login|me|deploy|mint|list|history|upload|verify|getMeta|get|delete|find|findAll|findMany|update|schema|setSessionToken|clearSessionToken|stringify|contractAddress|transactionHash|walletAddress|sessionToken|txHash|commitment|onchainTxHash|onchainKey|verified|id|userId|username|platformId)\b)|(\{|\}|\(|\)|\[|\]|,|;|:|=>|=|\.\.\.|\.|!|\?|\+|-|\*|\/|<|>|&|\|)|([a-zA-Z_$][\w$]*)|(\s+)|(.)/g
    let match
    while ((match = regex.exec(line)) !== null) {
      if (match[0] === "") break
      const [full, comment, str1, str2, keyword, num, bool, method, punct, ident, space, other] = match
      const key = `${i}-${match.index}`
      if (comment) {
        tokens.push(<span key={key} className="text-white/30 italic">{full}</span>)
      } else if (str1 || str2) {
        tokens.push(<span key={key} className="text-emerald-400">{full}</span>)
      } else if (keyword) {
        tokens.push(<span key={key} className="text-purple-400">{full}</span>)
      } else if (num) {
        tokens.push(<span key={key} className="text-amber-300">{full}</span>)
      } else if (bool) {
        tokens.push(<span key={key} className="text-amber-300">{full}</span>)
      } else if (method) {
        tokens.push(<span key={key} className="text-sky-400">{full}</span>)
      } else if (punct) {
        tokens.push(<span key={key} className="text-white/50">{full}</span>)
      } else if (ident) {
        if (full === "console" || full === "JSON") {
          tokens.push(<span key={key} className="text-sky-300">{full}</span>)
        } else if (full === "StarkbaseClient") {
          tokens.push(<span key={key} className="text-yellow-300">{full}</span>)
        } else if (full === "sb") {
          tokens.push(<span key={key} className="text-sky-300">{full}</span>)
        } else {
          tokens.push(<span key={key} className="text-white/80">{full}</span>)
        }
      } else if (space) {
        tokens.push(<span key={key}>{full}</span>)
      } else {
        tokens.push(<span key={key} className="text-white/80">{full}</span>)
      }
    }

    return <div key={i}>{tokens}</div>
  })
}

const codeSnippets: Record<string, string> = {
  auth: `import { StarkbaseClient } from '@starkbase/sdk'

const sb = new StarkbaseClient({
  apiUrl: 'https://api.starkbase.dev',
  platformId: 'plt_abc123',
  apiKey: 'sk_live_xxx',
})

// Register — returns wallet + session
const { walletAddress, sessionToken } =
  await sb.auth.register({
    username: 'alice',
    password: 's3cure!',
  })

sb.setSessionToken(sessionToken)

// Login existing user
const session = await sb.auth.login({
  username: 'alice',
  password: 's3cure!',
})

// Current user info
const me = await sb.auth.me()
// { userId, username, platformId, walletAddress }

await sb.auth.logout()`,

  tokens: `import { StarkbaseClient } from '@starkbase/sdk'

const sb = new StarkbaseClient({ ... })

// Deploy ERC-20
// deploy(name, symbol, initialSupply, recipientAddress)
const token = await sb.tokens.deploy(
  'GameGold',
  'GG',
  '1000000',
  '0x04a3...c7f2'
)
// { contractAddress, transactionHash, name, symbol }

// Mint tokens to a recipient
// mint(contractAddress, recipient, amount)
const tx = await sb.tokens.mint(
  token.contractAddress,
  '0x07b2...a4e1',
  '500'
)
// { txHash, recipient, amount }

// List all platform tokens
const tokens = await sb.tokens.list()

// Mint history for a token
const history = await sb.tokens.history(
  token.contractAddress
)`,

  blobs: `import { StarkbaseClient } from '@starkbase/sdk'

const sb = new StarkbaseClient({ ... })

// Upload to EigenDA (+ optional on-chain anchor)
// upload(file, { filename?, mimeType?, onchain? })
const blob = await sb.blobs.upload(file, {
  filename: 'report.pdf',
  mimeType: 'application/pdf',
  onchain: true,
})
// { id, commitment, onchainTxHash, size }

// Verify on-chain integrity
const proof = await sb.blobs.verify(blob.id)
// { verified, commitment, onchainKey, txHash }

// Download raw bytes
const bytes = await sb.blobs.get(blob.id)

// Metadata only
const meta = await sb.blobs.getMeta(blob.id)

// List all blobs
const all = await sb.blobs.list()

// Soft-delete (fails if onchain=true)
await sb.blobs.delete(blob.id)`,

  schemas: `import { StarkbaseClient } from '@starkbase/sdk'

const sb = new StarkbaseClient({ ... })

// Create schema (on-chain anchored)
// create(name, { fields }, { onchain? })
const schema = await sb.schemas.create(
  'users',
  { fields: {
      name: { type: 'string', required: true },
      role: { type: 'string' },
      age:  { type: 'number' },
  }},
  { onchain: true }
)
// { id, name, fields, onchainTxHash }

// Verify schema on-chain
await sb.schemas.verify('users')

// Document CRUD via sb.schema(name)
const users = sb.schema('users')

await users.upload('alice', { name: 'Alice', role: 'admin' })
const doc = await users.find('alice')
const all = await users.findAll()
const admins = await users.findMany({ role: 'admin' })
await users.update('alice', { age: 30 })
const history = await users.history('alice')
await users.delete('alice')`,
}

export function SdkSection() {
  const [active, setActive] = useState<string>("auth")

  return (
    <section className="bg-[#0a0a0a] min-h-screen flex items-center">
      <div className="max-w-5xl mx-auto px-6 w-full">
        <div className="flex flex-col md:flex-row gap-10 items-center">
          {/* Left — copy */}
          <div className="md:w-2/5 flex flex-col justify-center">
            <h2 className="font-serif text-5xl md:text-6xl font-black uppercase text-white leading-tight mb-5">
              One SDK
              <br />
              <span className="text-[#FF4D00]">for all.</span>
            </h2>
            <p className="text-white/50 font-mono text-base leading-relaxed mb-8">
              Auth, tokens, storage, schemas, events — everything through a
              single TypeScript SDK. No glue code, no third-party services.
            </p>

            {/* Tabs */}
            <div className="flex gap-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase transition-colors ${
                    active === t.key
                      ? "bg-[#FF4D00] text-black"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right — code block */}
          <div className="md:w-3/5 w-full">
            <div className="rounded-lg bg-[#111] border border-white/10 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-mono text-[10px] text-white/30 uppercase">
                  {active}.ts
                </span>
              </div>
              <pre className="p-4 overflow-x-auto text-sm leading-relaxed font-mono whitespace-pre">
                {highlightCode(codeSnippets[active])}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
