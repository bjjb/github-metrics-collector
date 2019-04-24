GitHub Metrics Collector
========================

A fairly simple JavaScript module to pull information about pull requests from
GitHub and store the information in a database.

Building
--------

Clone the repo and build the image:

	git clone git://github.com/bjjb/github-metrics-collector
	cd github-metrics-collector
	docker build -t github-metrics-collector .

Running
-------

Run the image, specifing the location of a database (if you want the data to
persist across runs), a GitHub repository name, and a GitHub token which has
permission to read repository info.

	cat > .env <<EOF
	GITHUB_METRICS_TOKEN=xxx
	GITHUB_METRICS_REPO=acme/tool
	EOF
	docker run -v --rm --env-file .env node index.js

Using the data
--------------

In order to visualize the data, pass it through
[github-metrics-graphite-exporter][1], and pass that data to a
[github-metrics-prometheus][2], then import it with [Grafana][3].

[1]: https://github.com/zalatnaicsongor/github-metrics-graphite-exporter
[2]: https://github.com/infinityworks/github-exporter
[3]: https://github.com/grafana/grafana
