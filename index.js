const express = require('express');
const fs = require('fs');
const path = require('path');

// Create the Express app
const app = express();

// Middleware to parse request body as JSON
app.use(express.json());

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Endpoint to render the template
app.get('/', (req, res) => {
    res.render('index');
});

// Endpoint to capture time log
app.post('/timelog', async (req, res) => {
    try {
        const { username, password, userAgent, wishType } = req.body;

        // Verify employee details from the employees.json file
        const employeesFilePath = path.join(__dirname, 'employees.json');
        const employeesData = fs.readFileSync(employeesFilePath, 'utf8');
        const employees = JSON.parse(employeesData);



        // Get the current date in yyyy-mm-dd format
        let now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        let errorLogs = [];
        const errorFileName = `error_${year}_${month}.json`;
        const errorFilePath = path.join(__dirname, errorFileName);

        if (fs.existsSync(errorFilePath)) {
            const fileContent = fs.readFileSync(errorFilePath, 'utf8');
            errorLogs = JSON.parse(fileContent);
        } else {
            fs.writeFileSync(errorFilePath, JSON.stringify(errorLogs));
        }

        const employee = employees.find(emp => emp.name === username && emp.password === password);
        if (!employee) {
            errorLogs.push({ isMobile: userAgent ? userAgent.includes('Mobile') : false, name: username, password: password, userAgent: userAgent, wishType: wishType, time: now, error: 'Invalid employee credentials' });
            res.status(401).send('Invalid employee credentials');
            return;
        }


        // Create a new time log entry
        const timeLog = {
            username,
            userAgent,
            isMobile: userAgent ? userAgent.includes('Mobile') : false,
            startDate: null,
            endDate: null,
            wishType
        };


        // Load existing time log entries or create a new file if it doesn't exist

        const filename = `timelogs_${year}_${month}.json`;
        const filePath = path.join(__dirname, filename);



        let timeLogs = [];
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            timeLogs = JSON.parse(fileContent);
        } else {
            fs.writeFileSync(filePath, JSON.stringify(timeLogs));
        }

        
        // Adjust the date to Kolkata time
        now.setUTCHours(now.getUTCHours() + 5); // Add 5 hours
        now.setUTCMinutes(now.getUTCMinutes() + 30); // Add 30 minutes

        // Format the adjusted date in dd-mm-yy HH:mm format
        const formattedDate = now.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          });
          
          const formattedTime = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          
          // Concatenate the formatted date and time
          const formattedDateTime = `${formattedDate} ${formattedTime}`;
          
        if (wishType == 'Evening') {
            // If an entry already exists for the current date, set the end date
            timeLog.endDate = formattedDateTime;
        } else {
            // If no entry exists for the current date, create a new entry with the start date
            timeLog.startDate = formattedDateTime;

        }
        timeLogs.push(timeLog);


        // Save the time log entries to the JSON file
        fs.writeFileSync(filePath, JSON.stringify(timeLogs, null, 2));

        res.sendStatus(200);
    } catch (error) {
        console.error('Error capturing time log:', error);
        errorLogs.push({ isMobile: userAgent ? userAgent.includes('Mobile') : false, name: username, password: password, userAgent: userAgent, wishType: wishType, time: now, error: error });
        res.sendStatus(500);
    }
});


app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = `./${filename}.json`;

    res.sendFile(filePath, { root: __dirname }, (err) => {
        if (err) {
            // Handle error if file sending fails
            console.error(err);
            res.status(404).send('File not found');
        }
    });
});

// Start the server
var port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Server listening on port ' + port);
});
