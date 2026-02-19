
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const [k, ...v] = line.split('=');
            if (k && v) {
                const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
                process.env[k.trim()] = val;
            }
        });
        console.log("Loaded .env.local");
    } else {
        console.log("⚠️ .env.local file NOT found at " + envPath);
    }
} catch (e) {
    console.error("Error loading .env.local", e);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL Configured:", !!url && !url.includes('example.com'));
console.log("Key Configured:", !!key && !key.includes('placeholder'));

if (!url || !key || url.includes('example.com')) {
    console.log("❌ Missing or Placeholder Supabase Credentials.");
    console.log("👉 Please update .env.local with your actual Supabase URL and Key.");
    process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
    try {
        console.log("Testing connection to table 'students'...");
        // Just select 1 row to test existance
        const { data, error } = await supabase.from('students').select('*').limit(1);

        if (error) {
            console.error("❌ Database Error: " + error.message);
            // PostgreSQL error 42P01 means table undefined
            if (error.message.includes('relation') || error.code === '42P01') {
                console.log("👉 HINT: Run the SQL schema to create the 'students' table.");
            }
        } else {
            console.log("✅ API Connection Successful! Table 'students' exists.");
        }
    } catch (err) {
        console.error("❌ Connection failed (Network/Client):", err.message);
    }
})();
