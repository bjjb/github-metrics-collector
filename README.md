GitHub Metrics Collector
========================

A fairly simple JavaScript module to pull information about pull requests from
GitHub and store the information in a database.

Running
-------

You need to specify an sqlite3 database, using the environment variable
`PULL_REQUESTS_DATABASE_PATH` (otherwise it will default to using `:memory:`,
which it kind of useless). You must also specify a GitHub repo to check, and a
token which grants permission to read that repo's pull requests; these may be
set in the database (in the `settings` table as values with the keys `repo`
and `token`, respectively), or as environment variables
(`PULL_REQUESTS_GITHUB_REPO` and `PULL_REQUESTS_GITHUB_TOKEN` respectively).

With these set, you can simply run `npm start`, and the database will be
updated with `pull_requests`. In the spirit of Unix, nothing is printed.

Using Docker
------------

A Dockerfile is included; in order to make use of an image, you'll need to
mount the database when running the container, and specify the (local) path to
that database.

Using the data
--------------

In order to visualize the data, pass it through
[github-metrics-graphite-exporter][1], and pass that data to a
[github-metrics-prometheus][2], then import it with [Grafana][3].

[1]: https://github.com/zalatnaicsongor/github-metrics-graphite-exporter
[2]: https://github.com/infinityworks/github-exporter
[3]: https://github.com/grafana/grafana
