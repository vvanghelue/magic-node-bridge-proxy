const express = require('express')
const querystring = require('querystring')
const path = require('path')

const app = express()
app.use((req, res, next) => {
	var chunks = []
    req.on('data', function(chunk) { 
        chunks.push(chunk)
    })
    req.on('end', function() {
        req.body = Buffer.concat(chunks).toString('utf8')
        next()
    })
})

const POOLING_TIMEOUT = 200 * 1000

const getRandomId = () => Math.round(Math.random() * 999999999999)

const createRequestRequest = ({ request, callback }) => {
	// console.log(request.body)
	const queryString = Object.keys(request.query).length > 0 ? ('?' + querystring.stringify(request.query)) : ''

	return {
		id: getRandomId(),
		callback: callback,
		status: 'to_process', // processing
		requestData: {
			method: request.method,
			url: `${request.path.substr(1)}${queryString}`,
			headers: request.headers,
			body: request.body
		}
	}
}

const requestManager = (() => {
	let requestRequests = []

	const removeRequestRequest = (requestRequest) => {
		requestRequests = requestRequests.filter(r => r.id != requestRequest.id)
	}

	const add = (requestRequest) => {
		requestRequests.push(requestRequest)
		// console.log('request added, total ' + requestRequests.length)

		setTimeout(() => {
			removeRequestRequest(requestRequest)
		}, POOLING_TIMEOUT)
	}

	const getRequestsToProcess = () => {
		return requestRequests
			.filter((rr) => rr.status == 'to_process')
			.map(
				(re) =>  {
					return { id: re.id, status: re.status, requestData: re.requestData }
				}
			)
	}

	const getRequestById = (id) => {
		return requestRequests.filter(r => r.id == id)[0] || null
	}

	const setAllAsProcessing = () => {
		for (let i = 0; i < requestRequests.length; i++) {
			requestRequests[i].id
			requestRequests[i].status = 'processing'
		}
	}

	const setAsDone = (id) => {
		for (let i = 0; i < requestRequests.length; i++) {
			if (requestRequests[i].id == id) {
				requestRequests[i].status = 'done'
			}
		}
	}

	const getAll = () => {
		return requestRequests
	}

	return {
		add,
		getAll,
		getRequestsToProcess,
		getRequestById,
		setAllAsProcessing,
		setAsDone
	}
})()

app.use((req, res, next) => {

	if (req.originalUrl == '/favicon.ico') {
		res.send('')
		return
	}

	if (req.originalUrl == '/') {
		res.send(`
			if you want to run chrome worker inside private network,
				you can do this here : <a href="/chrome-worker.html">chrome-worker.html</a>
		`)
		return
	}
	if (req.originalUrl == '/chrome-worker.html') {
		res.sendFile(path.resolve(__dirname + '/chrome-worker.html'))
		return
	}

	if (req.originalUrl == '/private-network-worker.js') {
		res.sendFile(path.resolve(__dirname + '/private-network-worker.js'))
		return
	}

	if (req.originalUrl == '/debug') {
		res.json(requestManager.getAll().reverse())
		return
	}

	if (req.originalUrl == '/requests_to_process') {
		res.set('Access-Control-Allow-Origin', '*')
		res.json(requestManager.getRequestsToProcess())
		// requestManager.setAllAsProcessing()
		return
	}

	if (req.originalUrl == '/on_request_processed') {
		// console.log(req.body)

		const body = JSON.parse(req.body)

		if (!body.id) {
			console.log('@TODO wtf')
		}

		const requestRequest = requestManager.getRequestById(body.id)
		if (!requestRequest) {
			console.log('Request not found or timed out')
			return
		}

		requestManager.setAsDone(body.id)

		try {
			requestRequest.callback({
				headers: body.headers,
				body: body.body
			})
		} catch (err) {
			console.log(err)
		}


		res.set('Access-Control-Allow-Origin', '*')
		res.send('ok')
		return
	}

	// console.log(`
	// 	##### ${req.originalUrl} #####
	// `)

	const callback = ({ headers, body }) => {
		try {
			Object.keys(headers).forEach((k) => {
				if (k == 'transfer-encoding') {
					return
				}
				if (k == 'content-encoding') {
					return
				}

				res.set(k, headers[k])
			})
			res.send(body)
		} catch (err) {
			console.log('Callback already called')
		}
	}

	requestManager.add(
		createRequestRequest({ request: req, callback: callback })
	)
})

const port = process.env.PORT || 5099
app.listen(port)

console.log('Listening at port ' + port)