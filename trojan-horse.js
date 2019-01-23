const fetch = require('node-fetch')

const bridgeServerUrl = process.env.BRIDGE_PROXY_URL || 'http://localhost:5099'
const mirroredEndpoint = process.env.MIRRORED_ENDPOINT_URL || 'http://real-endpoint.local'

const loop = (async () => {
	const res = await fetch(`${bridgeServerUrl}/spy/requests_to_process`)
	const requestsToProcess = await res.json()

	for (request of requestsToProcess) {
		const requestData = request.requestData
		console.log(console.log(`Requesting ${mirroredEndpoint}${requestData.path}`))

		requestData.headers.host = 
			mirroredEndpoint
				.replace('https://', '')
				.replace('http://', '')

		// requestData.headers.host = undefined

		// console.log(
		// 	requestData.method, 
		// 	requestData.headers, 
		// 	requestData.body
		// )

		const result = await fetch(`${mirroredEndpoint}${requestData.path}`, {
			method: requestData.method,
			headers: requestData.headers,
			body: requestData.method == 'POST' ? requestData.body : null,
			redirect: 'follow'
		})

		const bodyText = await result.text()

		// console.log(bodyText)

		await fetch(`${bridgeServerUrl}/spy/on_request_processed`, {
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
	}

	// process.exit()
	setTimeout(loop, 500)
})
loop()