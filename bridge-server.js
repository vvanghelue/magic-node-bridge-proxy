const express = require('express')
const querystring = require('querystring')

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

	const getAll = () => {
		return requestRequests
	}

	return {
		add,
		getAll,
		getRequestsToProcess,
		getRequestById,
		setAllAsProcessing
	}
})()

app.use((req, res, next) => {

	if (req.originalUrl == '/favicon.ico') {
		return
	}

	if (req.originalUrl == '/debug') {
		res.json(requestManager.getAll())
		return
	}

	if (req.originalUrl == '/requests_to_process') {
		res.set('Access-Control-Allow-Origin', '*')
		res.json(requestManager.getRequestsToProcess())
		requestManager.setAllAsProcessing()
		return
	}

	if (req.originalUrl == '/on_request_processed') {
		console.log(req.body)

		const body = JSON.parse(req.body)

		if (!body.id) {
			console.log('@TODO wtf')
		}

		const requestRequest = requestManager.getRequestById(body.id)
		if (!requestRequest) {
			console.log('Request not found or timed out')
			return
		}

		try {
			requestRequest.callback({
				headers: body.headers,
				body: body.body
			})
		} catch (err) {
			console.log(err)
		}

		requestManager.getAll()
			.filter(r => r.id == body.id)[0]
			.status = 'processed'

		
		res.set('Access-Control-Allow-Origin', '*')
		res.send('ok')
		return
	}

	// console.log(`
	// 	##### ${req.originalUrl} #####
	// `)

	const callback = ({ headers, body }) => {
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
	}

	requestManager.add(
		createRequestRequest({ request: req, callback: callback })
	)
})

const port = process.env.PORT || 5099
app.listen(port)

console.log('Listening at port ' + port)