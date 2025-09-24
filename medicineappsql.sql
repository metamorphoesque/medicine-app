CREATE TABLE IF NOT EXISTS healthcare_facilities (
    id SERIAL PRIMARY KEY,
    name TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    website TEXT,
    facility_type TEXT,
    doctor_category TEXT,
    state TEXT,
    district TEXT,
    pincode TEXT,
    UNIQUE(name, address)
);
