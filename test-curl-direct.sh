#!/bin/bash
curl --location --request POST 'https://cloud.yellow.ai/api/engagements/notifications/v2/push?bot=x1725620362017' \
--header 'Content-Type: application/json' \
--header 'x-api-key: yv2E9ELKy8cp28cwfKp0U6ptyHtdlvDkRCLJxBal' \
--data-raw '{
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
}'
