const UPSTREAM = 'https://ruihengstar.94751111.xyz';

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    const url = new URL(request.url);
    const upstreamUrl = new URL(UPSTREAM + url.pathname + url.search);

    // 构造转发请求
    const proxyReq = new Request(upstreamUrl, {
        method: request.method,
        headers: new Headers(request.headers),
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual',
    });

    // 修改 Host 头为源站
    proxyReq.headers.set('Host', upstreamUrl.hostname);

    // 发起请求
    let response = await fetch(proxyReq);

    // 处理重定向：将 Location 中的源站域名替换为当前域名
    if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
            const newLocation = location.replace(UPSTREAM, new URL(request.url).origin);
            response = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            });
            response.headers.set('Location', newLocation);
        }
    }

    // 重写 HTML 中硬编码的源站 URL
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html') && response.body) {
        let html = await response.text();
        html = html.replace(new RegExp(UPSTREAM, 'g'), new URL(request.url).origin);
        response = new Response(html, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    }

    // 添加允许跨域头，移除 iframe 限制
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.delete('X-Frame-Options');

    return response;
}
