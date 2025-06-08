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
    description: 'Updates the People record for a user and reflects relevant changes to the Users table (e.g., fullname, email). Only accessible by Staff - Standard User or System Admin.',
    urlParams: ['id'],
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
    NOTE: 'The :id is the Linkeduserid from the People table. The API updates People data and updates corresponding Users fields fullname and email accordingly. Requires Authorization header with a valid JWT token belonging to either Staff - Standard User or System Admin.'
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
    bodyParams: ['userid', 'clientlocationid'],
    NOTE: 'Requires Authorization header with a valid JWT token belonging to either Staff - Standard User or System Admin. The userid must be a Client - Standard User. The clientlocationid must exist and be linked to a client. If the user is already linked to the client, the API will return a message indicating so. make sure the ID of the location is the ClientLocation table ID not clientID. Once this is linked you can view the result in the table Userclients and in there the value you will see is clientID value.',
    example: {
      "userid": 38,
      "clientlocationid": 9 //this is the ClientLocation table ID not clientID
    }
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
    NOTE: 'Requires Authorization header with a valid JWT token belonging to either Client - Standard User, Staff - Standard User (admin staff), or System Admin. Client users must be linked to the client for the location in the Userclients table. Admin staff and System Admin can raise shifts for any location. The clientlocationid must exist and be linked to a client. The qualificationid must exist in Lookups and be of type Qualification. The API will create N staff shift slots in Clientstaffshifts, where N = totalrequiredstaffnumber. Each staff shift slot will have Status = "open" until accepted.',
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
    description: 'Staff/Admin: View available client shifts. Only shifts with Status = "open" are returned.',
    userType: ['Staff', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Staff - Standard User or System Admin)'],
    response: {
      200: {
        description: 'List of available shifts',
        body: {
          availableShifts: [
            {
              id: 1,
              Clientshiftrequestid: 2,
              Status: 'open',
              // ...
            }
          ]
        }
      },
      403: 'Access denied'
    },
    NOTE: 'This endpoint only returns shifts with Status = "open". Shifts that are pending approval or approved are not visible to employees.'
  },
  {
    method: 'POST',
    path: '/api/clientstaffshifts/:id/accept',
    description: 'Employee/Staff/Admin: Accept a client staff shift. Sets status to pending approval and assigns the shift to the user.',
    userType: ['Employee', 'Staff', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Employee - Standard User, Staff - Standard User, or System Admin)'],
    request: {
      params: {
        id: 'Shift ID'
      }
    },
    response: {
      200: {
        description: 'Shift accepted and pending admin approval',
        body: {
          message: 'Shift accepted and pending admin approval'
        }
      },
      400: 'Error message',
      403: 'Access denied',
      404: 'Shift not found'
    },
    example: {
      "message": "Shift accepted and pending admin approval"
    },
    NOTE: 'This endpoint is used by employees, staff, or admin to accept a shift. The shift status will be set to pending approval and will not be visible to other employees until it is rejected.'
  },
  {
    method: 'POST',
    path: '/api/clientstaffshifts/:id/approve',
    description: 'Staff/Admin: Approve a client staff shift. Sets status to approved and marks the shift as admin approved.',
    userType: ['Staff', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Staff - Standard User or System Admin)'],
    request: {
      params: {
        id: 'Shift ID'
      }
    },
    response: {
      200: {
        description: 'Shift approved',
        body: {
          message: 'Shift approved'
        }
      },
      400: 'Error message',
      403: 'Access denied',
      404: 'Shift not found'
    },
    example: {
      "message": "Shift approved"
    },
    NOTE: 'This endpoint is used by staff or admin to approve a shift that was accepted by an employee. The shift status will be set to approved and will not be visible to employees.'
  },
  {
    method: 'POST',
    path: '/api/clientstaffshifts/:id/reject',
    description: 'Staff/Admin: Reject a client staff shift. Sets status back to open and clears assignment so it is visible to employees again.',
    userType: ['Staff', 'System Admin'],
    headers: ['Authorization: Bearer <JWT token> (Staff - Standard User or System Admin)'],
    request: {
      params: {
        id: 'Shift ID'
      }
    },
    response: {
      200: {
        description: 'Shift rejected and reopened',
        body: {
          message: 'Shift rejected and reopened'
        }
      },
      400: 'Error message',
      403: 'Access denied',
      404: 'Shift not found'
    },
    example: {
      "message": "Shift rejected and reopened"
    },
    NOTE: 'This endpoint is used by staff or admin to reject a shift that was accepted by an employee. The shift will be reset to open and can be accepted by another employee.'
  }

];

module.exports = apiDocs;
