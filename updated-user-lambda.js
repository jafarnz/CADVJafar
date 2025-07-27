const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
    let body;

    switch (event.routeKey) {

        // CREATE USER
        case 'POST /users':
            body = JSON.parse(event.body);
            // Use the provided userID (which should be the Cognito sub) instead of generating one
            const userID = body.userID || `usr-${Date.now()}`;
            const preferences = body.preferences || {};

            const putParams = {
                TableName: 'localgigs',
                Item: {
                    userID: userID,
                    name: body.name,
                    email: body.email,
                    preferences: preferences,
                    profilePictureUrl: body.profilePictureUrl || null,
                    bio: body.bio || null,
                    location: body.location || null,
                    website: body.website || null,
                    joinedEvents: body.joinedEvents || [], // Add joinedEvents support
                    createdAt: body.createdAt || new Date().toISOString()
                }
            };

            dynamo.put(putParams, function(err, data) {
                if (err) {
                    console.error('DynamoDB put error:', err);
                    return callback(null, {
                        statusCode: 500,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type,Authorization",
                            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                        },
                        body: JSON.stringify({ error: 'Could not create user' })
                    });
                }
                return callback(null, {
                    statusCode: 201,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type,Authorization",
                        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                    },
                    body: JSON.stringify({ message: 'User created', userID: userID })
                });
            });
            break;

            // GET ALL USERS
        case 'GET /users':
            const scanParams = {
                TableName: 'localgigs'
            };

            dynamo.scan(scanParams, function(err, data) {
                if (err) {
                    console.error('DynamoDB scan error:', err);
                    return callback(null, {
                        statusCode: 500,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type,Authorization",
                            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                        },
                        body: JSON.stringify({ error: 'Could not retrieve users' })
                    });
                }

                return callback(null, {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type,Authorization",
                        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                    },
                    body: JSON.stringify(data.Items)
                });
            });
            break;

            // GET USER BY ID OR EMAIL
        case 'GET /users/{userID}':
            const requestedID = event.pathParameters.userID;

            // First try to get by userID
            const getParams = {
                TableName: 'localgigs',
                Key: {
                    userID: requestedID
                }
            };

            dynamo.get(getParams, function(err, result) {
                if (err) {
                    console.error('DynamoDB get error:', err);
                    return callback(null, {
                        statusCode: 500,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type,Authorization",
                            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                        },
                        body: JSON.stringify({ error: 'Error retrieving user' })
                    });
                }

                if (result.Item) {
                    // Ensure joinedEvents field exists
                    if (!result.Item.joinedEvents) {
                        result.Item.joinedEvents = [];
                    }
                    
                    // Found user by userID - return the actual item, not wrapped in message
                    return callback(null, {
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type,Authorization",
                            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                        },
                        body: JSON.stringify(result.Item)
                    });
                }

                // If not found by userID, try to find by email (scan operation)
                const scanByEmailParams = {
                    TableName: 'localgigs',
                    FilterExpression: 'email = :email',
                    ExpressionAttributeValues: {
                        ':email': requestedID
                    }
                };

                dynamo.scan(scanByEmailParams, function(emailErr, emailResult) {
                    if (emailErr) {
                        console.error('DynamoDB email scan error:', emailErr);
                        return callback(null, {
                            statusCode: 500,
                            headers: {
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                            },
                            body: JSON.stringify({ error: 'Error retrieving user by email' })
                        });
                    }

                    if (emailResult.Items && emailResult.Items.length > 0) {
                        // Ensure joinedEvents field exists
                        if (!emailResult.Items[0].joinedEvents) {
                            emailResult.Items[0].joinedEvents = [];
                        }
                        
                        // Found user by email - return the actual item, not wrapped in message
                        return callback(null, {
                            statusCode: 200,
                            headers: {
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                            },
                            body: JSON.stringify(emailResult.Items[0])
                        });
                    }

                    // User not found by either userID or email
                    return callback(null, {
                        statusCode: 404,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type,Authorization",
                            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                        },
                        body: JSON.stringify({ error: 'User not found' })
                    });
                });
            });
            break;

            // UPDATE USER (with userID in path)
        case 'PUT /users/{userID}':
            try {
                body = JSON.parse(event.body);
                console.log('UPDATE user request body:', body);
                console.log('UPDATE user pathParameters:', event.pathParameters);

                // Debug individual field values
                console.log('Field debugging:', {
                    nameValue: body.name,
                    emailValue: body.email,
                    nameType: typeof body.name,
                    emailType: typeof body.email,
                    nameIsEmpty: body.name === "",
                    emailIsEmpty: body.email === "",
                    joinedEventsLength: body.joinedEvents ? body.joinedEvents.length : 'undefined'
                });

                const updateParams = {
                    TableName: 'localgigs',
                    Key: {
                        userID: event.pathParameters.userID
                    },
                    UpdateExpression: "set #n = :name, email = :email, preferences = :prefs, profilePictureUrl = :pfp, bio = :bio, #loc = :location, website = :website, joinedEvents = :joinedEvents",
                    ExpressionAttributeNames: {
                        "#n": "name",
                        "#loc": "location" // location is a reserved word in DynamoDB
                    },
                    ExpressionAttributeValues: {
                        ":name": body.name !== undefined && body.name !== null && body.name !== "" ? String(body.name) : "",
                        ":email": body.email !== undefined && body.email !== null && body.email !== "" ? String(body.email) : "",
                        ":prefs": body.preferences || {},
                        ":pfp": body.profilePictureUrl || null,
                        ":bio": body.bio || null,
                        ":location": body.location || null,
                        ":website": body.website || null,
                        ":joinedEvents": body.joinedEvents || [] // Add joinedEvents support
                    }
                };

                console.log('DynamoDB update params:', updateParams);

                dynamo.update(updateParams, function(err, data) {
                    if (err) {
                        console.error('DynamoDB update error:', err);
                        return callback(null, {
                            statusCode: 500,
                            headers: {
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                            },
                            body: JSON.stringify({ error: 'Could not update user: ' + err.message })
                        });
                    }

                    // Return the updated user data by fetching it
                    const getUpdatedParams = {
                        TableName: 'localgigs',
                        Key: {
                            userID: event.pathParameters.userID
                        }
                    };

                    dynamo.get(getUpdatedParams, function(getErr, getResult) {
                        if (getErr || !getResult.Item) {
                            console.error('Error fetching updated user:', getErr);
                            return callback(null, {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                                    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                                },
                                body: JSON.stringify({ message: "User updated" })
                            });
                        }

                        return callback(null, {
                            statusCode: 200,
                            headers: {
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                            },
                            body: JSON.stringify(getResult.Item)
                        });
                    });
                });
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                return callback(null, {
                    statusCode: 400,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type,Authorization",
                        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                    },
                    body: JSON.stringify({ error: 'Invalid JSON in request body' })
                });
            }
            break;

            // UPDATE USER (without userID in path - extract from body)
        case 'PUT /users':
            try {
                body = JSON.parse(event.body);
                const userIdFromBody = body.userID;

                console.log('UPDATE user (no path) request body:', body);

                // Debug individual field values
                console.log('Field debugging (no path):', {
                    nameValue: body.name,
                    emailValue: body.email,
                    nameType: typeof body.name,
                    emailType: typeof body.email,
                    nameIsEmpty: body.name === "",
                    emailIsEmpty: body.email === "",
                    joinedEventsLength: body.joinedEvents ? body.joinedEvents.length : 'undefined'
                });

                if (!userIdFromBody) {
                    return callback(null, {
                        statusCode: 400,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type,Authorization",
                            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                        },
                        body: JSON.stringify({ error: 'userID is required in request body' })
                    });
                }

                const updateParamsNoPath = {
                    TableName: 'localgigs',
                    Key: {
                        userID: userIdFromBody
                    },
                    UpdateExpression: "set #n = :name, email = :email, preferences = :prefs, profilePictureUrl = :pfp, bio = :bio, #loc = :location, website = :website, joinedEvents = :joinedEvents",
                    ExpressionAttributeNames: {
                        "#n": "name",
                        "#loc": "location" // location is a reserved word in DynamoDB
                    },
                    ExpressionAttributeValues: {
                        ":name": body.name !== undefined && body.name !== null && body.name !== "" ? String(body.name) : "",
                        ":email": body.email !== undefined && body.email !== null && body.email !== "" ? String(body.email) : "",
                        ":prefs": body.preferences || {},
                        ":pfp": body.profilePictureUrl || null,
                        ":bio": body.bio || null,
                        ":location": body.location || null,
                        ":website": body.website || null,
                        ":joinedEvents": body.joinedEvents || [] // Add joinedEvents support
                    }
                };

                console.log('DynamoDB update params (no path):', updateParamsNoPath);

                dynamo.update(updateParamsNoPath, function(err, data) {
                    if (err) {
                        console.error('DynamoDB update error (no path):', err);
                        return callback(null, {
                            statusCode: 500,
                            headers: {
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                            },
                            body: JSON.stringify({ error: 'Could not update user: ' + err.message })
                        });
                    }

                    // Return the updated user data by fetching it
                    const getUpdatedParams = {
                        TableName: 'localgigs',
                        Key: {
                            userID: userIdFromBody
                        }
                    };

                    dynamo.get(getUpdatedParams, function(getErr, getResult) {
                        if (getErr || !getResult.Item) {
                            console.error('Error fetching updated user (no path):', getErr);
                            return callback(null, {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                                    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                                },
                                body: JSON.stringify({ message: "User updated" })
                            });
                        }

                        return callback(null, {
                            statusCode: 200,
                            headers: {
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                            },
                            body: JSON.stringify(getResult.Item)
                        });
                    });
                });
            } catch (parseError) {
                console.error('JSON parse error (no path):', parseError);
                return callback(null, {
                    statusCode: 400,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type,Authorization",
                        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                    },
                    body: JSON.stringify({ error: 'Invalid JSON in request body' })
                });
            }
            break;

            // DELETE USER
        case 'DELETE /users/{userID}':
            const deleteParams = {
                TableName: 'localgigs',
                Key: {
                    userID: event.pathParameters.userID
                }
            };

            dynamo.delete(deleteParams, function(err, data) {
                if (err) {
                    console.error('DynamoDB delete error:', err);
                    return callback(null, {
                        statusCode: 500,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type,Authorization",
                            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                        },
                        body: JSON.stringify({ error: 'Could not delete user' })
                    });
                }
                return callback(null, {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type,Authorization",
                        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                    },
                    body: JSON.stringify({ message: "User deleted" })
                });
            });
            break;

            // HANDLE OPTIONS for CORS
        case 'OPTIONS /users':
        case 'OPTIONS /users/{userID}':
            return callback(null, {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                },
                body: JSON.stringify({ message: "CORS preflight" })
            });

            // UNSUPPORTED ROUTE
        default:
            return callback(null, {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
                },
                body: JSON.stringify({ error: "Unsupported route: " + event.routeKey })
            });
    }
};
