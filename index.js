const { GitHub }  = require('github-graphql-api');
const Database = require('better-sqlite3')

function main() {

  const dsn = process.env.PULL_REQUESTS_DATABASE_PATH || ':memory:'
  const db = new Database(dsn)

  setup(db)
  update(db)
}

// Ensures that the database schema is set up, and that we have the GitHub
// repo and token, either from the settings table or from the environment.
function setup(db) {
  const sql = `
    CREATE TABLE IF NOT EXISTS pull_requests(
      id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(
      key TEXT PRIMARY KEY, value TEXT NOT NULL);`
  db.exec(sql)

  if (process.env['PULL_REQUESTS_GITHUB_TOKEN'])
    set(db, 'token', process.env.PULL_REQUESTS_GITHUB_TOKEN)

  if (!get(db, 'token'))
    throw new Error('no PULL_REQUESTS_GITHUB_TOKEN')

  if (process.env['PULL_REQUESTS_GITHUB_REPO'])
    set(db, 'repo', process.env.PULL_REQUESTS_GITHUB_REPO)

  if (!get(db, 'repo'))
    throw new Error('no PULL_REQUESTS_GITHUB_REPO')

  db.exec(sql)
}

// Stores a value in the settings table under 'key'; returns the value
function set(db, key, value) {
  const sql = `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`
  const stmt = db.prepare(sql)
  stmt.run(key, value)
  return value
}

// Gets the value from the settings table under 'key'
function get(db, key) {
  const stmt = db.prepare(`SELECT value FROM settings WHERE key = ?`)
  const row = stmt.get(key)
  if (!row) return undefined
  return row.value
}

// Gets a GraphQL query for the last 100 PRs after the cursor.
function makeQuery(owner, name, after) {
  const vars = ['$owner: String!', '$name: String!']
  const opts = [
    'first: 100',
    'states: MERGED',
    'orderBy: { field: UPDATED_AT, direction: ASC }'
  ]
  if (after) {
    vars.push('$after: String!')
    opts.push('after: $after')
  }
  return `query(${vars.join(', ')}) {
    repository(owner: $owner, name: $name) {
      pullRequests(${opts.join(', ')}) {
        edges {
          node { createdAt, closedAt, updatedAt, mergedAt, id },
          cursor
        }
      }
    }
  }`
}

// Gets 100 pull requests from GitHub under owner/name after the cursor. If
// the cursor is falsy, it gets the first 100.
async function getPullRequests(after) {
  const gql = makeQuery(owner, name, after)
  const response = await gh.query(gql, { owner, name, after }) 
  const { repository: { pullRequests: { edges } } } = response
  return edges
}

// Updates the database
async function update(db) {
  const token = get(db, 'token')
  const repo = get(db, 'repo')

  if (!repo)
    throw new Error('repo not set')

  const [owner, name] = repo.split('/')
  const gh = new GitHub({ token })
  const vars = { owner, name }
  const after = get(db, 'last cursor')

  if (after) // we have some data already; only get updated records
    vars.after = after

  const query = makeQuery(owner, name, after) 
  const response = await gh.query(query, vars)
  const edges = response.repository.pullRequests.edges

  if (edges.length > 0) { // store and update cursor
    edges.forEach(({ node }) => upsert(db, node))
    set(db, 'last cursor', edges[edges.length - 1].cursor)
  }

  if (edges.length === 100) // there may be more PRs to fetch!
    update(db)
}

function upsert(db, node) {
  const sql = `INSERT OR REPLACE INTO pull_requests (id, data) VALUES (?, ?)`
  const stmt = db.prepare(sql)
  stmt.run(node.id, JSON.stringify(node))
}

if (require.main === module)
  main()
