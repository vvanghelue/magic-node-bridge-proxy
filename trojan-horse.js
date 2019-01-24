const fetch = require('node-fetch')
const url = require('url')

const bridgeServerUrl = process.env.BRIDGE_PROXY_URL || 'http://localhost:5099'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

const SYNC_INTERVAL = 500 // ms

const loop = (async () => {
	let requestsToProcess
	try {
		const res = await fetch(`${bridgeServerUrl}/requests_to_process`)
		requestsToProcess = await res.json()
	} catch(err) {
		console.log(`Error on reaching bridge server, retrying in two seconds`)
		// console.log(err)
		setTimeout(loop, 2000)
		return
	}

	for (request of requestsToProcess) {
		let requestData
		try {
			requestData = request.requestData
			console.log(console.log(`Requesting ${requestData.url}`))

			const urlData = new URL(requestData.url)
			requestData.headers.host = urlData.host

			// console.log( 
			// 	requestData.method, 
			// 	requestData.url,
			// 	requestData.headers, 
			// 	requestData.body
			// )

			const result = await fetch(requestData.url, {
				method: requestData.method,
				headers: requestData.headers,
				body: requestData.method == 'POST' ? requestData.body : null,
				redirect: 'follow'
			})

			// console.log('Response headers :')
			// console.log(result.headers)

			const bodyText = await result.text()

			// console.log(bodyText)

			await fetch(`${bridgeServerUrl}/on_request_processed`, {
				method: 'POST',
				// headers: {
				// 	'content-type': 'text/plain'
				// }
				body: JSON.stringify({
					body: bodyText,
					headers: result.headers,
					id: request.id
				})
			})

		} catch(err) {
			console.log(`Error on requesting ${requestData.url}`)
			console.log(err)
		}
	}

	// process.exit()
	setTimeout(loop, 500)
})
loop()

console.log(`Server started, syncing every ${SYNC_INTERVAL} ms`)