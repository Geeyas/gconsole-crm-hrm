// ./docs/apiDocs.js
const apiDocs = [
  {
    method: 'POST',
    path: '/api/register',
    description: 'Registers a new user',
    bodyParams: ['firstname', 'lastname', 'username', 'email', 'password', 'usertype_id'],
    NOTE: 'usertype_id should be a Dropdown value and in backend only value [1, 2, 3, 4] should be passed. Also, in frontend ask user only for the email and later on pass that email as the username and send it to the backend.'
  },
  {
    method: 'POST',
    path: '/api/login',
    description: 'Logs in a user and returns a JWT token',
    bodyParams: ['username', 'password'],
    NOTE: 'https://www.npmjs.com/package/jwt-decode  -  Use <npm i jwt-decode> use this link to decode the JWT token and get the information of the user.'
  },
  {
    method: 'PUT',
    path: '/api/update-password',
    description: 'Updates user password. Only accessible by Staff - Standard User or System Admin. Requires username and newPassword fields.',
    bodyParams: ['username', 'newPassword'],
    headers: ['Authorization: Bearer <JWT token> (Staff - Standard User or System Admin)'],
    example: {
      "username": "user@example.com",
      "newPassword": "NewPassword123"
    },
    NOTE: 'This endpoint allows staff or admin to reset a user password without requiring the old password. Only staff or admin can perform this action.'
  },
  {
    method: 'GET',
    path: '/api/:table',
    description: 'Get all records from a table',
    urlParams: ['table']
  },
  {
    method: 'GET',
    path: '/api/:table/:id',
    description: 'Get a specific record from a table by ID',
    urlParams: ['table', 'id']
  },
  {
    method: 'POST',
    path: '/api/:table',
    description: 'Create a new record in a table',
    urlParams: ['table'],
    bodyParams: ['<fields based on table>']
  },
  {
    method: 'PUT',
    path: '/api/:table/:id',
    description: 'Update a record in a table',
    urlParams: ['table', 'id'],
    bodyParams: ['<fields to update>']
  },
  {
    method: 'DELETE',
    path: '/api/:table/:id',
    description: 'Delete a record from a table',
    urlParams: ['table', 'id']
  },
  {
    method: "GET",
    path: "/api/user/:id/usertype",
    description: "Fetches user details along with assigned usertype and portal information by user ID.",
    pathParams: ["id"],
    NOTE: "The 'id' is the user Linkeduserid from the people table. The endpoint returns user info joined with usertype and portal data. Returns 404 if user not found."
  },
  {
    method: 'PUT',
    path: '/api/people/:id',
    description: 'Updates the People record for a user and reflects relevant changes to the Users table (e.g., fullname, email, username). Only accessible by Staff - Standard User or System Admin. Will fail if the People record is soft-deleted (deletedat is not null).',
    urlParams: ['id (People table ID)'],
    bodyParams: [
      'Firstname',
      'Lastname',
      'Emailaddress',
      'Middlename',
      'Preferredname',
      'Country',
      'State',
      'Suburb',
      'Postcode',
      'HomeAddress',
      'Workaddress',
      'TFN',
      'BSB',
      'Bankaccountnumber',
    ],
    example: {
      request: {
        url: '/api/people/52',
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer <JWT token>',
          'Content-Type': 'application/json'
        },
        body: {
          "Firstname": "Test",
          "Lastname": "User",
          "Emailaddress": "testuser@example.com",
          "Middlename": "",
          "Preferredname": "",
          "Country": "Australia",
          "State": "NSW",
          "Suburb": "Sydney",
          "Postcode": "2000",
          "HomeAddress": "123 Main St",
          "Workaddress": "456 Work St",
          "TFN": "123456789",
          "BSB": "123-456",
          "Bankaccountnumber": "12345678"
        }
      },
      note: 'The :id in the URL is the People table ID, not the Users table ID.'
    },
    NOTE: 'The :id is the People table ID. The API updates People data and updates corresponding Users fields (fullname, email, username) accordingly. Requires Authorization header with a valid JWT token belonging to either Staff - Standard User or System Admin. The Users table email and username will always be set to the Emailaddress value from People. If the People record is soft-deleted (deletedat is not null), the update will be blocked with a clear error.'
  },
  {
    method: 'GET',
    path: '/api/:table/paginated',
    description: 'Get paginated records from a specific table.',
    urlParams: ['table'],
    queryParams: ['limit', 'page'],
    NOTE: 'The `table` parameter is the name of the table (e.g., Users). `limit` can be one of [5, 10, 20, 50]. `page` starts from 1. Returns a data array and a pagination object. Example: /api/Users/paginated?limit=10&page=2'
  },
  {
    method: 'POST',
    path: '/api/link-client-user-location',
    description: 'Links a Client - Standard User to the client for a specific location. Only accessible by Staff - Standard User or System Admin.',
    bodyParams: ['emailaddress', 'clientlocationid'],
    headers: ['Authorization: Bearer <JWT token> (Staff - Standard User or System Admin)'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works:**
──────────────────────────────────────────────────────────────
- Only Staff - Standard User or System Admin can use this endpoint.
- The emailaddress must belong to a user whose usertype is 'Client - Standard User'.
- The clientlocationid must exist and be linked to a client (Clientlocations table).
- If the user is already linked to the client for this location, the API will return a message indicating so.
- The clientlocationid is the Clientlocations table ID, not the clientID.
- Once linked, the result can be viewed in the Userclients table (the value is clientID).
- If the user is not found, or is not a Client - Standard User, or the location is invalid, a clear error is returned.

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in as Staff - Standard User or System Admin and get the JWT token.
2. Make a POST request to /api/link-client-user-location with the following JSON body:
   {
     "emailaddress": "clientuser@example.com",
     "clientlocationid": 9
   }
3. Include the JWT token in the Authorization header.

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X POST https://your-api-domain/api/link-client-user-location \
  -H "Authorization: Bearer <JWT token>" \
  -H "Content-Type: application/json" \
  -d '{"emailaddress": "clientuser@example.com", "clientlocationid": 9}'
──────────────────────────────────────────────────────────────
`,
    example: {
      request: {
        headers: {
          'Authorization': 'Bearer <JWT token for Staff - Standard User or System Admin>',
          'Content-Type': 'application/json'
        },
        body: {
          "emailaddress": "clientuser@example.com",
          "clientlocationid": 9 // This is the Clientlocations table ID, not clientID
        }
      },
      responses: {
        201: { message: 'User linked to client for this location.' },
        200: { message: 'User is already linked to this client.' },
        400: { message: 'Target user is not a Client - Standard User.' },
        403: { message: 'Access denied: Only staff or admin can link users to locations.' },
        404: { message: 'User not found with the provided email address.' },
        400.1: { message: 'Invalid client location.' }
      },
      frontendNotes: `
        - Use the user's email address (not user ID) when calling this endpoint.
        - Only users with usertype 'Client - Standard User' can be linked.
        - The clientlocationid must be the ID from the Clientlocations table.
        - The JWT token in the Authorization header must belong to a user with usertype 'Staff - Standard User' or 'System Admin'.
        - If the user is already linked, you will receive a 200 response with a message.
        - If the user is not found, not a client user, or the location is invalid, you will receive a clear error message.
        - Example cURL:
          curl -X POST https://your-api-domain/api/link-client-user-location \
            -H "Authorization: Bearer <JWT token for Staff - Standard User or System Admin>" \
            -H "Content-Type: application/json" \
            -d '{"emailaddress": "clientuser@example.com", "clientlocationid": 9}'
      `
    }
  },
  {
    method: 'GET',
    path: '/api/my-client-locations',
    description: 'Client: View only the locations assigned to the logged-in client user. Returns all Clientlocations for the client(s) this user is linked to via Userclients.',
    userType: ['Client - Standard User', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Client - Standard User or System Admin)'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works:**
──────────────────────────────────────────────────────────────
- Returns only the locations (from Clientlocations) for the client(s) the logged-in user is linked to in Userclients.
- If the user is not linked to any client, an empty array is returned.
- The response fields match the Clientlocations table.

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in as a Client - Standard User or System Admin and get the JWT token.
2. Make a GET request to /api/my-client-locations.
3. Include the JWT token in the Authorization header.
4. The response will be a list of assigned client locations.

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X GET https://your-api-domain/api/my-client-locations \
  -H "Authorization: Bearer <JWT token>"
──────────────────────────────────────────────────────────────
`,
    exampleRequest: {
      headers: {
        'Authorization': 'Bearer <JWT token>'
      }
    },
    exampleResponse: {
      200: {
        description: 'List of assigned client locations',
        body: {
          locations: [
            {
              id: 9,
              clientid: 3,
              locationaddress: '123 Main St',
              // ...other fields from Clientlocations...
            },
            // ...more locations if user is linked to multiple clients...
          ]
        }
      },
      403: 'Access denied'
    },
    NOTE: 'This endpoint returns only the locations (from Clientlocations) for the client(s) the logged-in user is linked to in Userclients. If the user is not linked to any client, an empty array is returned. The response fields match the Clientlocations table.'
  },
  {
    method: 'POST',
    path: '/api/clientshiftrequests',
    description: 'Creates a new client shift request and related staff shift slots. Client users can only raise shifts for their assigned locations. Admin staff (Staff - Standard User) and System Admin can raise shifts for any location.',
    bodyParams: [
      'clientlocationid',
      'shiftdate',
      'starttime',
      'endtime',
      'qualificationid',
      'totalrequiredstaffnumber',
      'additionalvalue'
    ],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works:**
──────────────────────────────────────────────────────────────
- Client users can only raise shifts for their assigned locations (must be linked in Userclients).
- Staff - Standard User and System Admin can raise shifts for any location.
- The clientlocationid must exist and be linked to a client.
- The qualificationid must exist in Lookups and be of type Qualification.
- The API will create N staff shift slots in Clientstaffshifts, where N = totalrequiredstaffnumber. Each staff shift slot will have Status = "open" until accepted.

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in as a Client - Standard User, Staff - Standard User, or System Admin and get the JWT token.
2. Make a POST request to /api/clientshiftrequests with the required fields in the JSON body.
3. Include the JWT token in the Authorization header.
4. The response will include the created shift request and staff shifts.

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X POST https://your-api-domain/api/clientshiftrequests \
  -H "Authorization: Bearer <JWT token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientlocationid": 9,
    "shiftdate": "2025-06-05",
    "starttime": "08:00",
    "endtime": "16:00",
    "qualificationid": 12,
    "totalrequiredstaffnumber": 3,
    "additionalvalue": "Day shift, urgent"
  }'
──────────────────────────────────────────────────────────────
`,
    example: {
      "clientlocationid": 9,
      "shiftdate": "2025-06-05",
      "starttime": "2025-06-05 08:00:00",
      "endtime": "2025-06-05 16:00:00",
      "qualificationid": 12,
      "totalrequiredstaffnumber": 3,
      "additionalvalue": "Day shift, urgent"
    }
  },
  {
    method: 'GET',
    path: '/api/available-client-shifts',
    description: 'Get a list of available client shifts. The data you get depends on who you are (your user type).',
    userType: ['Employee - Standard User', 'Client - Standard User', 'Staff - Standard User', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (required)'],
    queryParams: ['limit', 'page'],
    response: {
      200: {
        description: 'A list of available shifts or shift slots, depending on user type',
        body: {
          availableShifts: [
            '// For Staff/Admin: All shifts for all hospitals/locations, grouped with staff requirements and slot status',
            '// For Client: All shifts for their own hospital(s)/locations, grouped with staff requirements and slot status',
            '// For Employee: Only open shift slots available to accept'
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 123
          }
        }
      },
      403: 'Access denied'
    },
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (explained simply):**
──────────────────────────────────────────────────────────────
- This API shows you shifts, but what you see depends on your role (user type):
  * If you are Staff or Admin: You see ALL shifts for ALL hospitals/locations. You also see how many staff are needed, how many have accepted, and how many spots are still open.
  * If you are a Client: You see ONLY the shifts that belong to your own hospital(s) or locations. You do NOT see shifts for other clients.
  * If you are an Employee: You see ONLY the open shift slots that you can accept (not grouped by shift, just a list of available slots).

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in the user and get the JWT token from the /api/login endpoint.
2. When calling this API, always include the JWT token in the Authorization header like this:
   Authorization: Bearer <JWT token>
3. You can use pagination with the following query parameters:
   - limit (default 10, max 50)
   - page (default 1)
   Example: /api/available-client-shifts?limit=5&page=2
4. Make a GET request to /api/available-client-shifts.
5. Read the 'availableShifts' array in the response and display it to the user.
6. The response also includes a 'pagination' object: { page, limit, total }

──────────────────────────────────────────────────────────────
**Things to keep in mind:**
──────────────────────────────────────────────────────────────
- If you do not send a valid JWT token, you will get a 403 error (access denied).
- If you are a Client, you will only see your own shifts. If you are Staff/Admin, you see everything. If you are an Employee, you only see open slots.
- The API does all the filtering for you. The front-end does NOT need to filter the data based on user type.
- Always check the user type from the JWT token (decode it on the front-end if you want to show/hide UI elements).
- If the 'availableShifts' array is empty, it means there are no shifts for you to see.
- This endpoint is safe to call for all logged-in users, but what you see depends on your role.

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X GET https://your-api-domain/api/available-client-shifts \
  -H "Authorization: Bearer <JWT token>" \
  -G -d "limit=5" -d "page=2"
──────────────────────────────────────────────────────────────
`
  },
  {
    method: 'POST',
    path: '/api/clientstaffshifts/:id/accept',
    description: 'Accept an open client staff shift. Sets status to "pending approval" and records who accepted it and when.',
    userType: ['Employee - Standard User', 'Staff - Standard User', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Employee, Staff, or Admin)'],
    request: {
      params: {
        id: 'The ID of the Clientstaffshifts record to accept (must be in "open" status).'
      }
    },
    response: {
      200: {
        description: 'Shift successfully accepted and is now pending approval.',
        body: {
          message: 'Shift accepted and pending admin approval'
        }
      },
      400: { message: 'Shift slot is not open for acceptance (e.g., already accepted, approved, or not in "open" status).' },
      401: { message: 'Unauthorized (e.g., token missing, invalid, or expired).' },
      403: { message: 'Access denied: Only employees, staff, or admin can accept shifts.' },
      404: { message: 'Shift slot not found.' },
      500: { message: 'Failed to accept shift (server error).' }
    },
    example: {
      request: 'POST /api/clientstaffshifts/24/accept',
      headers: { 'Authorization': 'Bearer <JWT_TOKEN_FOR_EMPLOYEE_STAFF_OR_ADMIN>' },
      response: {
        message: "Shift accepted and pending admin approval"
      }
    },
    NOTE: `
──────────────────────────────────────────────────────────────
**Frontend Developer Notes:**
──────────────────────────────────────────────────────────────
- **Who can use:** 'Employee - Standard User', 'Staff - Standard User', 'System Admin'.
- **Shift Status:** The target shift (identified by \`:id\`) MUST have a \`Status\` of "open".
- **Action:**
  - Updates \`Clientstaffshifts.Status\` to "pending approval".
  - Sets \`Clientstaffshifts.Acceptedbyid\` to the ID of the user making the request.
  - Sets \`Clientstaffshifts.Acceptedat\` to the current timestamp.
- **Outcome:** The shift is no longer "open" and won't appear in the general list of available shifts for other employees. It now awaits action (approve/reject) by a Staff/Admin user.
- **Error Handling:**
  - \`400 Bad Request\`: If the shift is not "open".
  - \`403 Forbidden\`: If the logged-in user is not an Employee, Staff, or Admin.
  - \`404 Not Found\`: If the shift ID is invalid.
──────────────────────────────────────────────────────────────
`
  },
  {
    method: 'POST',
    path: '/api/clientstaffshifts/:id/approve',
    description: 'Approve a "pending approval" client staff shift. Sets status to "approved" and records who approved it and when.',
    userType: ['Staff - Standard User', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Staff or Admin only)'],
    request: {
      params: {
        id: 'The ID of the Clientstaffshifts record to approve (must be in "pending approval" status).'
      }
    },
    response: {
      200: {
        description: 'Shift successfully approved.',
        body: {
          message: 'Shift approved'
        }
      },
      400: { message: 'Shift slot is not pending approval (e.g., already approved, open, or not in "pending approval" status).' },
      401: { message: 'Unauthorized (e.g., token missing, invalid, or expired).' },
      403: { message: 'Access denied: Only staff or admin can approve shifts.' },
      404: { message: 'Shift slot not found.' },
      500: { message: 'Failed to approve shift (server error).' }
    },
    example: {
      request: 'POST /api/clientstaffshifts/24/approve',
      headers: { 'Authorization': 'Bearer <JWT_TOKEN_FOR_STAFF_OR_ADMIN>' },
      response: {
        message: "Shift approved"
      }
    },
    NOTE: `
──────────────────────────────────────────────────────────────
**Frontend Developer Notes:**
──────────────────────────────────────────────────────────────
- **Who can use:** 'Staff - Standard User', 'System Admin'.
- **Shift Status:** The target shift (identified by \`:id\`) MUST have a \`Status\` of "pending approval".
- **Action:**
  - Updates \`Clientstaffshifts.Status\` to "approved".
  - Sets \`Clientstaffshifts.Approvedat\` to the current timestamp.
  - Sets \`Clientstaffshifts.Approvedbyid\` to the ID of the admin/staff user making the request.
- **Outcome:** The shift is now confirmed.
- **Error Handling:**
  - \`400 Bad Request\`: If the shift is not "pending approval".
  - \`403 Forbidden\`: If the logged-in user is not Staff or Admin.
  - \`404 Not Found\`: If the shift ID is invalid.
──────────────────────────────────────────────────────────────
`
  },
  {
    method: 'POST',
    path: '/api/clientstaffshifts/:id/reject',
    description: 'Reject a "pending approval" client staff shift. Sets status back to "open" and clears acceptance details.',
    userType: ['Staff - Standard User', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Staff or Admin only)'],
    request: {
      params: {
        id: 'The ID of the Clientstaffshifts record to reject (must be in "pending approval" status).'
      }
    },
    response: {
      200: {
        description: 'Shift successfully rejected and reopened.',
        body: {
          message: 'Shift rejected and reopened'
        }
      },
      400: { message: 'Shift slot is not pending approval (e.g., already approved, open, or not in "pending approval" status).' },
      401: { message: 'Unauthorized (e.g., token missing, invalid, or expired).' },
      403: { message: 'Access denied: Only staff or admin can reject shifts.' },
      404: { message: 'Shift slot not found.' },
      500: { message: 'Failed to reject shift (server error).' }
    },
    example: {
      request: 'POST /api/clientstaffshifts/24/reject',
      headers: { 'Authorization': 'Bearer <JWT_TOKEN_FOR_STAFF_OR_ADMIN>' },
      response: {
        message: "Shift rejected and reopened"
      }
    },
    NOTE: `
──────────────────────────────────────────────────────────────
**Frontend Developer Notes:**
──────────────────────────────────────────────────────────────
- **Who can use:** 'Staff - Standard User', 'System Admin'.
- **Shift Status:** The target shift (identified by \`:id\`) MUST have a \`Status\` of "pending approval".
- **Action:**
  - Updates \`Clientstaffshifts.Status\` back to "open".
  - Clears (sets to NULL) \`Clientstaffshifts.Acceptedbyid\`, \`Clientstaffshifts.Acceptedat\`, \`Clientstaffshifts.Approvedat\`, and \`Clientstaffshifts.Approvedbyid\`.
- **Outcome:** The shift becomes available again for any eligible employee to accept.
- **Error Handling:**
  - \`400 Bad Request\`: If the shift is not "pending approval".
  - \`403 Forbidden\`: If the logged-in user is not Staff or Admin.
  - \`404 Not Found\`: If the shift ID is invalid.
──────────────────────────────────────────────────────────────
`
  },
  {
    method: 'DELETE',
    path: '/api/People/:id',
    description: 'Soft-deletes a person in the People table by setting deletedat and deletedbyid. Requires authentication. :id is the People table ID.',
    urlParams: ['id'],
    headers: ['Authorization: Bearer <JWT token>'],
    NOTE: 'This endpoint does not hard-delete the record. It sets deletedat to the current date/time and deletedbyid to the user ID from the JWT. Returns 404 if the person is not found.',
    example: {
      request: {
        headers: {
          'Authorization': 'Bearer <JWT token>'
        }
      },
      response: {
        200: { message: 'Person soft-deleted' },
        404: { message: 'Person not found' }
      }
    }
  },
  {
    method: 'GET',
    path: '/api/all-client-locations',
    description: 'Staff/Admin: Get a list of all unique client users, with each client having an array of their linked location names. Returns each client user (Firstname, Lastname, Emailaddress) and an array of their location names.',
    userType: ['Staff - Standard User', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Staff - Standard User or System Admin)'],
    exampleRequest: {
      headers: {
        'Authorization': 'Bearer <JWT token for Staff - Standard User or System Admin>'
      }
    },
    exampleResponse: {
      200: {
        description: 'List of unique clients, each with an array of their linked location names.',
        body: {
          clients: [
            {
              Firstname: 'John',
              Lastname: 'Doe',
              Emailaddress: 'john.doe@example.com',
              locationnames: ['123 Main St', '456 Oak Ave']
            },
            {
              Firstname: 'Jane',
              Lastname: 'Smith',
              Emailaddress: 'jane.smith@example.com',
              locationnames: ['789 Pine Ln']
            }
            // ...more unique clients...
          ]
        }
      },
      403: 'Access denied'
    },
    NOTE: `
      - This endpoint is only accessible by users with usertype \\'Staff - Standard User\\' or \\'System Admin\\'.
      - Returns a list of unique client users (usertype \\'Client - Standard User\\').
      - Each client object in the response contains the client\\'s Firstname, Lastname, Emailaddress, and an array called \\'locationnames\\' listing all locations they are linked to.
      - This format is suitable for displaying clients in a table with a dropdown or list for their multiple locations.
      - Example cURL:
        curl -X GET https://your-api-domain/api/all-client-locations \\\\
          -H "Authorization: Bearer <JWT token for Staff - Standard User or System Admin>"
    `
  }

];

module.exports = apiDocs;
