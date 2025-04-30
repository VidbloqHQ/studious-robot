// export const baseApi = "https://server.thestreamlink.com"
// export const baseApi = "http://localhost:8001"

export const baseApi = "https://probable-octo-umbrella-production.up.railway.app"


// export const websocketUrl = baseApi.replace('http', 'ws') + '/ws';

export const websocketUrl = `${baseApi.replace(/^http/, 'ws')}/ws`;

