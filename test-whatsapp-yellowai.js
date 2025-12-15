const https = require('https');

// Minimal valid PDF Base64 for testing
const samplePdfBase64 = "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSXQogIC9SZXNvdXJjZXMgPDwKICAgIC9Gb250IDw8CiAgICAgIC9GMSA0IDAgUgogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvUHRpbWVzLVJvbWFuCj4+CmVuZG9iagoKNSAwIG9iago8PCAvTGVuZ3RoIDQ0ID4+CnN0cmVhbQpCVAo3MCA1MCBUZAovRjEgMTIgVGYKKEhlbGxvLCB3b3JsZCEpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYwIDAwMDAwIG4gCjAwMDAwMDAxNTcgMDAwMDAgbiAKMDAwMDAwMDI3NSAwMDAwMCBuIAowMDAwMDAwMzY1IDAwMDAwIG4gCnRyYWlsZXIKPDwKICAvU2l6ZSA2CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQyNQolJUVPRgo=";

const data = JSON.stringify({
    "userDetails": {
        "number": "8879978026"
    },
    "notification": {
        "type": "whatsapp",
        "sender": "917738282666",
        "templateId": "2wgenesys_voicebot041225_english",
        "params": {
            "1": "Manushi",
            "2": "",
            "3": "iuo",
            "4": "4",
            "5": "iuo",
            "6": "4"
        },
        "media": {
            "mediaBase64": samplePdfBase64,
            "mediaType": "application/pdf",
            "mediaName": "report.pdf"
        }
    },
    "config": {
        "customPayload": {
            "1": "MOT14734768",
            "2": "AMIT KUMAR",
            "3": "02269324700"
        },
        "checkOptIn": false
    }
});

const options = {
    hostname: 'cloud.yellow.ai',
    path: '/api/engagements/notifications/v2/push?bot=x1725620362017',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'yv2E9ELKy8cp28cwfKp0U6ptyHtdlvDkRCLJxBal',
        'Cookie': '_cfuvid=tyxgdeG4MNJrYjQyieOqzBwFGzlPbyz6RXXqkB6nIho-1753870919323-0.0.1.1-604800000',
        'Content-Length': data.length
    },
    rejectUnauthorized: false
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
