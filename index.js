const { GitHub }  = require('github-graphql-api');
const { Database } = require('sqlite3').verbose()

// Die if we're missing required info
'TOKEN DB USER REPO'.split(' ').forEach((v) => {
  if (!process.env[v]) {
    console.error(`Missing env var: ${v}`)
    process.exit(1)
  }
})

const { TOKEN, DB } = process.env
const [ USER, REPO ] = process.env.REPO.split('/')

const github = new GitHub({ token: TOKEN })
const db = new Database(DB)

main()

async function main() {
  // console.debug(TOKEN)
  // process.exit(0)
  setup()

  if (!lastCursor()) await initialize()
  await update()
}

function setup() {
  const sql = `
    CREATE TABLE IF NOT EXISTS pull_requests(
      id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(
      key TEXT PRIMARY KEY, value TEXT NOT NULL);`
  db.exec(sql)
}

function lastCursor() {
  const sql = `select value from settings where key = 'last cursor' limit 1`
  let lastCursor = null
  db.get(sql, (err, row) => { if (row) lastCursor = row.value })
  return lastCursor
}

async function initialize() {
  console.debug('initializing...')
  // Clear out the database
  db.exec(`DELETE FROM pull_requests`)
  db.exec(`DELETE FROM settings`)
  // Fetch the pull requests from GitHub...
  let gql = `
    query { 
      repository(owner:"${USER}", name:"${REPO}") { 
        pullRequests(last:100, states:MERGED, orderBy: {
          field:UPDATED_AT,
          direction: ASC
        }) {
          edges {
            node {
              createdAt, closedAt, updatedAt, mergedAt, id
            }
            cursor
          }
        }
      }
    }`
  console.debug(gql)
  result = await github.query(gql)
  const { repository: { pullRequests: { edges } } } = result
  let lastCursor
  edges.forEach(({ node, cursor }) => {
    upsertPullRequest(node)
    lastCursor = cursor
  })
  setLastCursor(lastCursor)
}

async function update() {
  console.debug('updating...')
}

function upsertPullRequest(node) {
  const sql = `INSERT OR REPLACE INTO pull_requests (id, data) VALUES (?, ?)`
  db.run(sql, node.id, JSON.stringify(node))
}

function setLastCursor(cursor) {
  const sql = `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`
  db.run(sql, 'last cursor', cursor)
}
