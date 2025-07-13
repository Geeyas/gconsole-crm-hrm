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
    method: 'GET',
    path: '/api/my-qualifications',
    description: 'Get all qualifications assigned to the logged-in employee (Employee - Standard User only)',
    userType: ['Employee - Standard User'],
    headers: ['Authorization: Bearer <JWT token> (Employee - Standard User)'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (Employee Self-Service):**
──────────────────────────────────────────────────────────────
- Only Employee - Standard User can use this endpoint
- No parameters needed - automatically uses JWT token to identify employee
- Returns all qualifications assigned to the logged-in employee
- Includes registration details (registration number, dates) if available
- Only shows active (non-deleted) qualifications
- Results are sorted alphabetically by qualification name

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in as Employee - Standard User and get the JWT token
2. Make a GET request to /api/my-qualifications
3. Include the JWT token in the Authorization header
4. The response will show all qualifications assigned to the employee

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X GET https://your-api-domain/api/my-qualifications \\
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
        description: 'Qualifications retrieved successfully',
        body: {
          message: 'Qualifications retrieved successfully',
          qualifications: [
            {
              ID: 1,
              Name: 'Registered Nurse',
              Createdat: '2024-01-15T10:30:00.000Z',
              Updatedat: '2024-01-15T10:30:00.000Z',
              Registrationnumber: 'RN123456',
              Dateofregistration: '2024-01-01',
              Dateofexpiry: '2025-01-01'
            },
            {
              ID: 2,
              Name: 'CPR Certification',
              Createdat: '2024-01-20T14:45:00.000Z',
              Updatedat: '2024-01-20T14:45:00.000Z',
              Registrationnumber: 'CPR789',
              Dateofregistration: '2024-01-15',
              Dateofexpiry: '2024-07-15'
            }
          ]
        }
      },
      401: 'Unauthorized: No user ID in token',
      403: 'Access denied: Only employees can use this endpoint',
      404: 'No People record found for this user',
      500: 'Failed to fetch qualifications'
    },
    NOTE: 'This endpoint provides a simple, secure way for employees to view their own qualifications. No need to know their own ID - the JWT token automatically identifies the employee. Only Employee - Standard User accounts can access this endpoint. Returns qualifications with registration details if available.'
  },
  {
    method: 'GET',
    path: '/api/people/:id/qualifications',
    description: 'Get all qualifications assigned to a person (People.ID)',
    userType: ['Staff - Standard User', 'System Admin', 'Self'],
    headers: ['Authorization: Bearer <JWT token>'],
    urlParams: ['id (People table ID or Linkeduserid)'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (Admin/Staff/Self model):**
──────────────────────────────────────────────────────────────
- Staff - Standard User and System Admin can view any employee's qualifications
- Employees can only view their own qualifications (self-service)
- The :id parameter can be either People.ID or Linkeduserid
- Returns all active qualifications for the specified person
- Includes creation and update timestamps for audit purposes

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in and get the JWT token
2. Make a GET request to /api/people/{id}/qualifications
3. Include the JWT token in the Authorization header
4. The response will show all qualifications for the specified person

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X GET https://your-api-domain/api/people/123/qualifications \\
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
        description: 'Qualifications retrieved successfully',
        body: {
          qualifications: [
            {
              ID: 1,
              Name: 'Registered Nurse',
              Createdat: '2024-01-15T10:30:00.000Z',
              Updatedat: '2024-01-15T10:30:00.000Z'
            },
            {
              ID: 2,
              Name: 'CPR Certification',
              Createdat: '2024-01-20T14:45:00.000Z',
              Updatedat: '2024-01-20T14:45:00.000Z'
            }
          ]
        }
      },
      400: 'Missing person/user id',
      403: 'Access denied: Only staff/admin or the user themselves can view qualifications',
      404: 'No People record found for this id (as ID or Linkeduserid)',
      500: 'Failed to fetch qualifications'
    },
    NOTE: 'This endpoint allows staff/admin to view any employee qualifications or employees to view their own. The :id parameter accepts both People.ID and Linkeduserid for flexibility. Authorization is enforced - employees can only view their own qualifications while staff/admin can view any employee qualifications.'
  },
  {
    method: 'POST',
    path: '/api/people/:id/qualifications',
    description: 'Add a qualification to an employee (Staff/Admin or Self)',
    userType: ['Staff - Standard User', 'System Admin', 'Self'],
    headers: ['Authorization: Bearer <JWT token>'],
    urlParams: ['id (People table ID or Linkeduserid)'],
    bodyParams: ['qualificationId'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (Assignment model):**
──────────────────────────────────────────────────────────────
- Staff - Standard User and System Admin can add qualifications to any employee
- Employees can add qualifications to themselves (self-service)
- The :id parameter can be either People.ID or Linkeduserid
- Creates a new record in Staffqualifications table
- Handles duplicate assignments gracefully
- Includes audit trail with creation timestamps

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in and get the JWT token
2. Make a POST request to /api/people/{id}/qualifications
3. Include the JWT token in the Authorization header
4. Send qualificationId in the request body
5. The response will confirm the qualification was added

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X POST https://your-api-domain/api/people/123/qualifications \\
  -H "Authorization: Bearer <JWT token>" \\
  -H "Content-Type: application/json" \\
  -d '{"qualificationId": 1}'
──────────────────────────────────────────────────────────────
`,
    exampleRequest: {
      headers: {
        'Authorization': 'Bearer <JWT token>',
        'Content-Type': 'application/json'
      },
      body: {
        qualificationId: 1
      }
    },
    exampleResponse: {
      201: {
        description: 'Qualification added successfully',
        body: {
          message: 'Qualification added to employee.'
        }
      },
      400: 'Missing person/user id or qualificationId',
      403: 'Access denied: Only staff/admin or the user themselves can add qualifications',
      404: 'No People record found for this id (as ID or Linkeduserid)',
      409: 'Qualification already assigned to this user',
      500: 'Failed to add qualification'
    },
    NOTE: 'This endpoint allows assignment of qualifications to employees. Staff/admin can assign to any employee, while employees can assign to themselves. The qualificationId must exist in the Qualifications table. Duplicate assignments are prevented with a 409 error.'
  },
  {
    method: 'DELETE',
    path: '/api/people/:id/qualifications/:qualificationId',
    description: 'Remove a qualification from an employee (Staff/Admin or Self)',
    userType: ['Staff - Standard User', 'System Admin', 'Self'],
    headers: ['Authorization: Bearer <JWT token>'],
    urlParams: ['id (People table ID or Linkeduserid)', 'qualificationId'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (Soft Delete model):**
──────────────────────────────────────────────────────────────
- Staff - Standard User and System Admin can remove qualifications from any employee
- Employees can remove qualifications from themselves (self-service)
- The :id parameter can be either People.ID or Linkeduserid
- Performs soft delete (sets Deletedat and Deletedbyid)
- Maintains data integrity and audit trail
- Can be restored by re-adding the same qualification

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in and get the JWT token
2. Make a DELETE request to /api/people/{id}/qualifications/{qualificationId}
3. Include the JWT token in the Authorization header
4. The response will confirm the qualification was removed

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X DELETE https://your-api-domain/api/people/123/qualifications/1 \\
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
        description: 'Qualification removed successfully',
        body: {
          message: 'Qualification removed (soft deleted) from employee.'
        }
      },
      400: 'Missing person/user id or qualificationId',
      403: 'Access denied: Only staff/admin or the user themselves can remove qualifications',
      404: 'No People record found for this id (as ID or Linkeduserid)',
      500: 'Failed to remove qualification'
    },
    NOTE: 'This endpoint performs soft delete of qualifications, maintaining data integrity. Staff/admin can remove from any employee, while employees can remove from themselves. The qualification is not permanently deleted and can be restored by re-adding it.'
  },
  {
    method: 'PUT',
    path: '/api/people/:id/qualifications/:qualificationId/registration-details',
    description: 'Set registration details for a staff qualification (Staff/Admin or Self)',
    userType: ['Staff - Standard User', 'System Admin', 'Self'],
    headers: ['Authorization: Bearer <JWT token>'],
    urlParams: ['id (People table ID or Linkeduserid)', 'qualificationId'],
    bodyParams: ['registrationnumber', 'dateofregistration', 'dateofexpiry'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (Registration Details model):**
──────────────────────────────────────────────────────────────
- Staff - Standard User and System Admin can set registration details for any employee
- Employees can set registration details for their own qualifications (self-service)
- The :id parameter can be either People.ID or Linkeduserid
- All fields (registrationnumber, dateofregistration, dateofexpiry) are required
- Updates the Staffqualifications table with professional registration information
- Includes audit trail with update timestamps

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in and get the JWT token
2. Make a PUT request to /api/people/{id}/qualifications/{qualificationId}/registration-details
3. Include the JWT token in the Authorization header
4. Send all required fields in the request body
5. The response will confirm the registration details were set

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X PUT https://your-api-domain/api/people/123/qualifications/1/registration-details \\
  -H "Authorization: Bearer <JWT token>" \\
  -H "Content-Type: application/json" \\
  -d '{"registrationnumber": "RN123456", "dateofregistration": "2024-01-01", "dateofexpiry": "2025-01-01"}'
──────────────────────────────────────────────────────────────
`,
    exampleRequest: {
      headers: {
        'Authorization': 'Bearer <JWT token>',
        'Content-Type': 'application/json'
      },
      body: {
        registrationnumber: 'RN123456',
        dateofregistration: '2024-01-01',
        dateofexpiry: '2025-01-01'
      }
    },
    exampleResponse: {
      200: {
        description: 'Registration details set successfully',
        body: {
          message: 'Staff qualification registration details set.',
          staffqualification: {
            Userid: 123,
            QualificationID: 1,
            Registrationnumber: 'RN123456',
            Dateofregistration: '2024-01-01',
            Dateofexpiry: '2025-01-01',
            Updatedat: '2024-01-15T10:30:00.000Z',
            Updatedbyid: 456
          }
        }
      },
      400: 'Missing personId or qualificationId',
      403: 'Access denied: Only staff/admin or the user themselves can set registration details',
      404: 'Staff qualification not found for this user',
      500: 'Failed to set staff qualification registration details'
    },
    NOTE: 'This endpoint allows setting professional registration details for qualifications. All fields are mandatory. Staff/admin can set for any employee, while employees can set for themselves. Useful for tracking professional certifications and their expiry dates.'
  },
  {
    method: 'GET',
    path: '/api/people/:id/qualifications/:qualificationId/registration-details',
    description: 'Get registration details for a staff qualification (Staff/Admin or Self)',
    userType: ['Staff - Standard User', 'System Admin', 'Self'],
    headers: ['Authorization: Bearer <JWT token>'],
    urlParams: ['id (People table ID or Linkeduserid)', 'qualificationId'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (Registration Details Retrieval):**
──────────────────────────────────────────────────────────────
- Staff - Standard User and System Admin can view registration details for any employee
- Employees can view registration details for their own qualifications (self-service)
- The :id parameter can be either People.ID or Linkeduserid
- Returns registration number, registration date, and expiry date
- Only returns details for active (non-deleted) qualifications

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in and get the JWT token
2. Make a GET request to /api/people/{id}/qualifications/{qualificationId}/registration-details
3. Include the JWT token in the Authorization header
4. The response will show the registration details for the qualification

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X GET https://your-api-domain/api/people/123/qualifications/1/registration-details \\
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
        description: 'Registration details retrieved successfully',
        body: {
          registrationnumber: 'RN123456',
          dateofregistration: '2024-01-01',
          dateofexpiry: '2025-01-01'
        }
      },
      400: 'Missing personId or qualificationId',
      403: 'Access denied: Only staff/admin or the user themselves can view registration details',
      404: 'Staff qualification not found for this user',
      500: 'Failed to get staff qualification registration details'
    },
    NOTE: 'This endpoint retrieves professional registration details for a specific qualification. Staff/admin can view any employee details, while employees can only view their own. Useful for checking registration status and expiry dates.'
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
    description: 'Links a Client - Standard User to a client. Only accessible by Staff - Standard User or System Admin.',
    bodyParams: ['emailaddress', 'clientid'],
    headers: ['Authorization: Bearer <JWT token> (Staff - Standard User or System Admin)'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (Client-centric model):**
──────────────────────────────────────────────────────────────
- Only Staff - Standard User or System Admin can use this endpoint.
- The emailaddress must belong to a user whose usertype is 'Client - Standard User'.
- The clientid must exist in the Clients table.
- If the user is already linked to the client, the API will return a message indicating so.
- Once linked, the result can be viewed in the Userclients table (the value is clientID).
- If the user is not found, or is not a Client - Standard User, or the client is invalid, a clear error is returned.
- **NEW:** Users are now linked to the Client (not just a single location). The response includes the client and an array of all their locations.

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in as Staff - Standard User or System Admin and get the JWT token.
2. Make a POST request to /api/link-client-user-location with the following JSON body:
   {
     "emailaddress": "clientuser@example.com",
     "clientid": 1
   }
3. Include the JWT token in the Authorization header.

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X POST https://your-api-domain/api/link-client-user-location \
  -H "Authorization: Bearer <JWT token>" \
  -H "Content-Type: application/json" \
  -d '{"emailaddress": "clientuser@example.com", "clientid": 1}'
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
          "clientid": 1 // This is the Clients table ID
        }
      },
      responses: {
        201: { 
          message: 'User linked to client. User now has access to all locations for this client.',
          client: { id: 1, name: 'Acme Hospital' },
          locations: [
            {
              id: 9,
              clientid: 1,
              locationname: 'Main Campus',
              locationaddress: '123 Main St',
              // ...other fields from Clientlocations...
            },
            {
              id: 10,
              clientid: 1,
              locationname: 'West Wing',
              locationaddress: '456 West St',
              // ...other fields from Clientlocations...
            }
            // ...all locations for this client...
          ]
        },
        200: { message: 'User is already linked to this client.',
          client: { id: 1, name: 'Acme Hospital' },
          locations: [
            // ...all locations for this client...
          ]
        },
        400: { message: 'Target user is not a Client - Standard User.' },
        403: { message: 'Access denied: Only staff or admin can link users to clients.' },
        404: { message: 'User not found with the provided email address.' },
        400.1: { message: 'Invalid client.' }
      },
      frontendNotes: `
        - Use the user's email address (not user ID) when calling this endpoint.
        - Only users with usertype 'Client - Standard User' can be linked.
        - The clientid must be the ID from the Clients table.
        - The JWT token in the Authorization header must belong to a user with usertype 'Staff - Standard User' or 'System Admin'.
        - If the user is already linked, you will receive a 200 response with a message and all locations for the client.
        - If the user is not found, not a client user, or the client is invalid, you will receive a clear error message.
        - On success, the response includes the client name and an array of all their locations.
        - Example cURL:
          curl -X POST https://your-api-domain/api/link-client-user-location \
            -H "Authorization: Bearer <JWT token for Staff - Standard User or System Admin>" \
            -H "Content-Type: application/json" \
            -d '{"emailaddress": "clientuser@example.com", "clientid": 1}'
        - **NEW:** The user is now linked to the client, not just a single location. The response always includes all locations for the client.
      `
    }
  },
  {
    method: 'GET',
    path: '/api/my-client-locations',
    description: 'View all clients and their locations. System Admin and Staff - Standard User see all client locations; Client - Standard User sees only their linked client locations.',
    userType: ['Client - Standard User', 'System Admin', 'Staff - Standard User'],
    headers: ['Authorization: Bearer <JWT token> (Client - Standard User, System Admin, or Staff - Standard User)'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (Client-centric model):**
──────────────────────────────────────────────────────────────
- System Admin and Staff - Standard User: See all clients and all their locations (not just linked ones).
- Client - Standard User: Sees only clients and locations they are linked to (via Userclients).
- The response is grouped by client, with each client object containing an array of their locations.
- If the user is not linked to any client (for Client - Standard User), an empty array is returned.

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in as a Client - Standard User, System Admin, or Staff - Standard User and get the JWT token.
2. Make a GET request to /api/my-client-locations.
3. Include the JWT token in the Authorization header.
4. The response will be a list of clients, each with their locations.

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
        description: 'List of clients, each with their locations',
        body: {
          clients: [
            {
              id: 3,
              name: 'Acme Hospital',
              locations: [
                {
                  id: 9,
                  clientid: 3,
                  locationname: 'Main Campus',
                  locationaddress: '123 Main St'
                  // ...other fields from Clientlocations...
                },
                {
                  id: 10,
                  clientid: 3,
                  locationname: 'West Wing',
                  locationaddress: '456 West St'
                  // ...other fields from Clientlocations...
                }
                // ...more locations for this client...
              ]
            },
            // ...more clients if user is linked to multiple clients (Client - Standard User) or all clients (admin/staff)...
          ]
        }
      },
      403: 'Access denied'
    },
    NOTE: 'System Admin and Staff - Standard User see all client locations; Client - Standard User sees only their linked client locations. The response is grouped by client.'
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
    NOTE: [
      '──────────────────────────────────────────────────────────────',
      '**How this API works:**',
      '──────────────────────────────────────────────────────────────',
      '- Client users can only raise shifts for their assigned locations (must be linked in Userclients).',
      '- Staff - Standard User and System Admin can raise shifts for any location.',
      '- The clientlocationid must exist and be linked to a client.',
      '- The qualificationid must exist in Lookups and be of type Qualification.',
      '- The API will create N staff shift slots in Clientstaffshifts, where N = totalrequiredstaffnumber. Each staff shift slot will have Status = "open" until accepted.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**How to use this API:**',
      '──────────────────────────────────────────────────────────────',
      '1. Log in as a Client - Standard User, Staff - Standard User, or System Admin and get the JWT token.',
      '2. Make a POST request to /api/clientshiftrequests with the required fields in the JSON body.',
      '3. Include the JWT token in the Authorization header.',
      '4. The response will include the created shift request and staff shifts.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**Datetime Format Update:**',
      '──────────────────────────────────────────────────────────────',
      '- The starttime and endtime fields must now be full datetime strings in the format YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS (e.g., 2025-06-20 08:00).',
      '- Both fields are required and endtime must be after starttime.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**Example cURL:**',
      '──────────────────────────────────────────────────────────────',
      'curl -X POST https://your-api-domain/api/clientshiftrequests \\ ',
      '  -H "Authorization: Bearer <JWT token>" \\ ',
      '  -H "Content-Type: application/json" \\ ',
      '  -d \'{',
      '    "clientlocationid": 9,',
      '    "shiftdate": "2025-06-05",',
      '    "starttime": "2025-06-05 08:00:00",',
      '    "endtime": "2025-06-05 16:00:00",',
      '    "qualificationid": 12,',
      '    "totalrequiredstaffnumber": 3,',
      '    "additionalvalue": "Day shift, urgent"',
      '  }\'',
      '──────────────────────────────────────────────────────────────'
    ].join('\n'),
    example: {
      "clientlocationid": 9,
      "shiftdate": "2025-06-05",
      "starttime": "2025-06-05 08:00:00",
      "endtime": "2025-06-05 16:00:00",
      "qualificationid": 12,
      "totalrequiredstaffnumber": 3,
      "additionalvalue": "Day shift, urgent"
    },
    response: {
      201: {
        message: 'Shift request created successfully.',
        shift: {
          id: 123,
          clientid: 3,
          clientname: 'Acme Hospital',
          clientlocationid: 9,
          // ...other fields from Clientshiftrequests...
        },
        staffShifts: [
          // ...array of created staff shift slots...
        ]
      }
    }
  },
  {
    method: 'PUT',
    path: '/api/clientshiftrequests/:id',
    description: 'Edit an existing client shift request. Only the user who created the shift (Client - Standard User) or Staff - Standard User/System Admin can edit. Cannot edit if the shift has already started or is not in an editable state.',
    urlParams: ['id (Clientshiftrequests table ID)'],
    bodyParams: [
      'clientlocationid (optional)',
      'shiftdate (optional)',
      'starttime (optional)',
      'endtime (optional)',
      'qualificationid (optional)',
      'totalrequiredstaffnumber (optional)',
      'additionalvalue (optional)'
    ],
    headers: ['Authorization: Bearer <JWT token> (required)'],
    example: {
      request: {
        url: '/api/clientshiftrequests/123',
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer <JWT token>',
          'Content-Type': 'application/json'
        },
        body: {
          'starttime': '2025-06-05 09:00:00',
          'endtime': '2025-06-05 17:00:00',
          'totalrequiredstaffnumber': 4
        }
      },
      responses: {
        200: { message: 'Shift request updated successfully.', shift: {/* updated shift object */} },
        400: { message: 'Cannot edit shift: already started or not in editable state.' },
        403: { message: 'Access denied: Only the creator or staff/admin can edit this shift.' },
        404: { message: 'Shift request not found.' }
      }
    },
    NOTE: [
      '──────────────────────────────────────────────────────────────',
      '**How this API works:**',
      '──────────────────────────────────────────────────────────────',
      '- Only the user who created the shift (Client - Standard User) or Staff - Standard User/System Admin can edit.',
      '- Cannot edit if the shift has already started or is not in an editable state.',
      '- On update, audit fields (Updatedat, Updatedbyid) are set if present in the table.',
      '- Returns the updated shift object on success.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**Example cURL:**',
      '──────────────────────────────────────────────────────────────',
      'curl -X PUT https://your-api-domain/api/clientshiftrequests/123 \\',
      '  -H "Authorization: Bearer <JWT token>" \\',
      '  -H "Content-Type: application/json" \\',
      '  -d \'{"starttime": "2025-06-05 09:00:00", "endtime": "2025-06-05 17:00:00", "totalrequiredstaffnumber": 4}\'',
      '──────────────────────────────────────────────────────────────'
    ].join('\n')
  },
  {
    method: 'DELETE',
    path: '/api/clientshiftrequests/:id',
    description: 'Delete (soft-delete) a client shift request. Only the user who created the shift (Client - Standard User) or Staff - Standard User/System Admin can delete. Cannot delete if the shift has already started or is not in a deletable state. When a shift is deleted, all related staff shift slots in Clientstaffshifts are also soft-deleted (Deletedat and Deletedbyid are set).',
    urlParams: ['id (Clientshiftrequests table ID)'],
    headers: ['Authorization: Bearer <JWT token> (required)'],
    example: {
      request: {
        url: '/api/clientshiftrequests/123',
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer <JWT token>'
        }
      },
      responses: {
        200: { message: 'Shift request and all related staff shift slots deleted successfully.' },
        400: { message: 'Cannot delete shift: already started or not in deletable state.' },
        403: { message: 'Access denied: Only the creator or staff/admin can delete this shift.' },
        404: { message: 'Shift request not found.' }
      }
    },
    NOTE: [
      '──────────────────────────────────────────────────────────────',
      '**How this API works:**',
      '──────────────────────────────────────────────────────────────',
      '- Only the user who created the shift (Client - Standard User) or Staff - Standard User/System Admin can delete.',
      '- Cannot delete if the shift has already started or is not in a deletable state.',
      '- This is a soft-delete: sets Deletedat and Deletedbyid in both Clientshiftrequests and all related Clientstaffshifts.',
      '- Returns a confirmation message on success.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**Example cURL:**',
      '──────────────────────────────────────────────────────────────',
      'curl -X DELETE https://your-api-domain/api/clientshiftrequests/123 \\',
      '  -H "Authorization: Bearer <JWT token>"',
      '──────────────────────────────────────────────────────────────'
    ].join('\n')
  },
  {
    method: 'DELETE',
    path: '/api/People/:id',
    description: 'Soft-deletes a person in the People table by setting deletedat and deletedbyid. Requires authentication. :id is the People table ID.',
    urlParams: ['id'],
    headers: ['Authorization: Bearer <JWT token>'],
    NOTE: 'This endpoint does not hard-delete the record. It sets deletedat to the current date/time and deletedbyid to the user ID from the JWT. Returns 404 if the person is not found.'
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
  },
  {
    method: 'EMAIL',
    path: 'Automatic',
    description: 'Email notifications are sent automatically by the backend when a shift is accepted or approved. The frontend does NOT need to trigger any email logic.'
  },
  {
    method: 'GET',
    path: '/api/client-user-locations',
    description: 'Admin staff: Get all client locations linked to a client user by email address.',
    queryParams: ['emailaddress (required)'],
    userType: ['Staff - Standard User', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Staff - Standard User or System Admin)'],
    NOTE: [
      '──────────────────────────────────────────────────────────────',
      '**How this API works:**',
      '──────────────────────────────────────────────────────────────',
      '- Only accessible by Staff - Standard User or System Admin.',
      '- Pass the client user\'s email address as a query parameter (?emailaddress=clientuser@example.com).',
      '- The user must exist and be a Client - Standard User.',
      '- Returns all client locations the user is linked to (via Userclients), with client info.',
      '- Returns an empty array if the user is not linked to any client.',
      '- Returns a clear error if the user is not found or not a Client - Standard User.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**How to use this API:**',
      '──────────────────────────────────────────────────────────────',
      '1. Log in as Staff - Standard User or System Admin and get the JWT token.',
      '2. Make a GET request to /api/client-user-locations?emailaddress=clientuser@example.com',
      '3. Include the JWT token in the Authorization header.',
      '4. The response will be a list of locations the client user is linked to, with client info.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**Example cURL:**',
      '──────────────────────────────────────────────────────────────',
      'curl -X GET https://your-api-domain/api/client-user-locations?emailaddress=clientuser@example.com \\',
      '  -H "Authorization: Bearer <JWT token>"',
      '──────────────────────────────────────────────────────────────',
    ].join('\n'),
    exampleRequest: {
      headers: {
        'Authorization': 'Bearer <JWT token for Staff - Standard User or System Admin>'
      },
      query: {
        emailaddress: 'clientuser@example.com'
      }
    },
    exampleResponse: {
      200: {
        description: 'List of locations the client user is linked to, with client info',
        body: {
          locations: [
            {
              ID: 9,
              LocationName: 'Main Campus',
              clientid: 1,
              clientname: 'Acme Hospital',
              useremail: 'clientuser@example.com',
              userfirstname: 'Jane',
              userlastname: 'Smith'
            },
            // ...more locations...
          ]
        }
      },
      400: { message: 'Target user is not a Client - Standard User.' },
      403: { message: 'Access denied: Only staff or admin can use this endpoint.' },
      404: { message: 'User not found with the provided email address.' }
    }
  },
  {
    method: 'POST',
    path: '/api/unlink-client-user',
    description: 'Admin staff: Unlink a client user from a client by email and clientid.',
    bodyParams: ['emailaddress (required)', 'clientid (required)'],
    userType: ['Staff - Standard User', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Staff - Standard User or System Admin)'],
    NOTE: [
      '──────────────────────────────────────────────────────────────',
      '**How this API works:**',
      '──────────────────────────────────────────────────────────────',
      '- Only accessible by Staff - Standard User or System Admin.',
      '- Pass the client user\'s email address and the clientid in the JSON body.',
      '- The user must exist and be a Client - Standard User.',
      '- The user must be currently linked to the client.',
      '- On success, the user is unlinked from the client.',
      '- Returns a clear error if the user is not found, not a Client - Standard User, or not linked to the client.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**How to use this API:**',
      '──────────────────────────────────────────────────────────────',
      '1. Log in as Staff - Standard User or System Admin and get the JWT token.',
      '2. Make a POST request to /api/unlink-client-user with the following JSON body:',
      '   {',
      '     "emailaddress": "clientuser@example.com",',
      '     "clientid": 1',
      '   }',
      '3. Include the JWT token in the Authorization header.',
      '4. On success, you will receive a confirmation message.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**Example cURL:**',
      '──────────────────────────────────────────────────────────────',
      'curl -X POST https://your-api-domain/api/unlink-client-user \\',
      '  -H "Authorization: Bearer <JWT token>" \\',
      '  -H "Content-Type: application/json" \\',
      '  -d \'{"emailaddress": "clientuser@example.com", "clientid": 1}\'',
      '──────────────────────────────────────────────────────────────',
    ].join('\n'),
    example: {
      request: {
        headers: {
          'Authorization': 'Bearer <JWT token for Staff - Standard User or System Admin>',
          'Content-Type': 'application/json'
        },
        body: {
          emailaddress: 'clientuser@example.com',
          clientid: 1
        }
      },
      responses: {
        200: { message: 'User unlinked from client successfully.' },
        400: { message: 'Target user is not a Client - Standard User.' },
        403: { message: 'Access denied: Only staff or admin can use this endpoint.' },
        404: { message: 'User not found with the provided email address.' },
        404.1: { message: 'User is not linked to this client.' }
      }
    }
  },
  {
    method: 'GET',
    path: '/api/my-shifts',
    description: 'Get My Shifts (Employee)',
    userType: ['Employee - Standard User'],
    headers: ['Authorization: Bearer <JWT token> (Employee - Standard User)'],
    NOTE: `
──────────────────────────────────────────────────────────────
**How this API works (Employee-centric model):**
──────────────────────────────────────────────────────────────
- Returns all shifts that the logged-in employee has accepted (status 'pending approval') or has been assigned (status 'approved').
- The endpoint allows employees to track the shifts they have accepted or are scheduled to work.

──────────────────────────────────────────────────────────────
**Data Fetched:**
──────────────────────────────────────────────────────────────
- Staff shift slot ID
- Parent shift request ID
- Client ID
- Shift status ('pending approval' or 'approved')
- Slot order number
- Shift date (YYYY-MM-DD)
- Shift start time (YYYY-MM-DD HH:mm)
- Shift end time (YYYY-MM-DD HH:mm)
- Qualification group ID
- Location name
- Location address
- Client name
- List of qualification names required for the shift

──────────────────────────────────────────────────────────────
**How to use this API:**
──────────────────────────────────────────────────────────────
1. Log in as Employee - Standard User and get the JWT token.
2. Make a GET request to /api/my-shifts.
3. Include the JWT token in the Authorization header.
4. The response will be a list of shifts assigned to the employee.

──────────────────────────────────────────────────────────────
**Example cURL:**
──────────────────────────────────────────────────────────────
curl -X GET https://your-api-domain/api/my-shifts \
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
        description: 'List of shifts assigned to the employee',
        body: {
          myShifts: [
            {
              staffshiftid: 1,
              Clientshiftrequestid: 101,
              Clientid: 3,
              Status: 'pending approval',
              Order: 1,
              Shiftdate: '2025-06-20',
              Starttime: '2025-06-20 08:00',
              Endtime: '2025-06-20 16:00',
              Qualificationgroupid: 12,
              LocationName: 'Main Campus',
              LocationAddress: '123 Main St',
              clientname: 'Acme Hospital',
              qualificationname: ['Nurse', 'CPR']
            },
            // ...more shifts...
          ]
        }
      },
      403: 'Access denied'
    },
    NOTE: 'This endpoint returns all shifts that the logged-in employee has accepted or has been assigned. Only available to Employee - Standard User accounts. Data is fetched by joining Clientstaffshifts, Clientshiftrequests, Clientlocations, and Clients tables. Useful for employees to track their upcoming and pending shifts.'
  },
  {
    method: 'POST',
    path: '/api/clientstaffshifts/:id/assign-employee',
    description: 'Assign employee to staff shift slot',
    bodyParams: ['emailaddress'],
    urlParams: ['id'],
    headers: ['Authorization: Bearer <JWT token> (Staff, Client, or System Admin)'],
    example: {
      request: {
        url: '/api/clientstaffshifts/123/assign-employee',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer <JWT token>',
          'Content-Type': 'application/json'
        },
        body: {
          "emailaddress": "employee@email.com"
        }
      },
      responses: {
        200: { 
          message: 'Employee assigned to shift slot.',
          staffshiftid: 123,
          employeeid: 456
        },
        400: { message: 'Employee already has a shift assigned that overlaps with this time.' },
        404: { message: 'Employee or staff shift slot not found' },
        403: { message: 'Access denied' }
      }
    },
    NOTE: [
      '──────────────────────────────────────────────────────────────',
      '**How this API works:**',
      '──────────────────────────────────────────────────────────────',
      '- Assigns the employee (by email) to the specified staff shift slot, with clash/overlap checks.',
      '- Updates all relevant audit fields.',
      '',
      '──────────────────────────────────────────────────────────────',
      '**Example cURL:**',
      '──────────────────────────────────────────────────────────────',
      'curl -X POST https://your-api-domain/api/clientstaffshifts/123/assign-employee \\',
      '  -H "Authorization: Bearer <JWT token>" \\',
      '  -H "Content-Type: application/json" \\',
      '  -d \'{"emailaddress": "employee@email.com"}\'',
      '──────────────────────────────────────────────────────────────'
    ].join('\n')
  },
  {
    method: 'POST',
    path: '/api/clientstaffshifts/:id/remove-employee',
    description: 'Removes the assigned employee from a staff shift slot, making the slot open and available for other employees to accept. Notifies the removed employee by email.',
    urlParams: ['id (Clientstaffshift slot ID)'],
    headers: ['Authorization: Bearer <JWT token> (Staff, Client, or System Admin)'],
    bodyParams: [],
    responses: {
      200: { message: 'Employee removed from shift slot and notified.' },
      400: { message: 'No employee is currently assigned to this shift slot.' },
      403: { message: 'Access denied: Only staff, client, or admin can remove employees.' },
      404: { message: 'Staff shift slot not found.' },
      500: { message: 'Failed to remove employee from shift slot.' }
    },
    NOTE: 'This endpoint clears the assignment and approval fields for the slot, sets status to "open", and sends an email notification to the removed employee.'
  },
  {
    method: 'POST',
    path: '/api/contact-admin',
    description: 'Contact Administrator: Sends an email to admin@ygit.tech and a confirmation to the user. No authentication required. Rate limited to 5 requests per 10 minutes per IP.',
    bodyParams: ['email', 'subject', 'message', 'source (optional)'],
    example: {
      request: {
        url: '/api/contact-admin',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: 'user@example.com',
          subject: 'Need access to my account',
          message: 'Hi, I can\'t log in to my account. Please assist.',
          source: 'login-contact-modal'
        }
      },
      responses: {
        200: { success: true, message: 'Email sent successfully.' },
        400: { success: false, error: 'Validation error.' },
        429: { success: false, error: 'Too many requests, please try again later.' },
        500: { success: false, error: 'Failed to send email. Please try again later.' }
      }
    },
    NOTE: 'All fields required except source. Email is validated. Rate limited. Sends notification to admin@ygit.tech and confirmation to the user.'
  }
];

module.exports = apiDocs;
