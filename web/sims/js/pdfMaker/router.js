function route(request, response, pathname, urlMapping) {
    if (typeof urlMapping[pathname] === 'function') {
        urlMapping[pathname](request, response);
    } else {
        console.log(pathname + "doesn't in urlMapping.");
    }
}

exports.route = route;