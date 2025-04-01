CREATE TABLE resources (
    id integer NOT NULL DEFAULT nextval('resources_id_seq'::regclass),
    name text NOT NULL,
    description text NOT NULL,
    provider text NOT NULL,
    schema jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE access_requests (
    id integer NOT NULL DEFAULT nextval('access_requests_id_seq'::regclass),
    resource_id integer,
    requester text NOT NULL,
    status text,
    created_at timestamp without time zone DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT access_requests_status_check CHECK (status = ANY (ARRAY['pending', 'approved', 'denied'])),
    CONSTRAINT access_requests_resource_id_fkey FOREIGN KEY (resource_id)
        REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TABLE certificates (
    certificate_id integer NOT NULL DEFAULT nextval('certificates_certificate_id_seq'::regclass),
    department_id character varying(255),
    resource_id character varying(255),
    certificate_data jsonb,
    PRIMARY KEY (certificate_id)
);

CREATE TABLE applications (
    application_id integer NOT NULL DEFAULT nextval('applications_application_id_seq'::regclass),
    application_data jsonb NOT NULL,
    formatted_id VARCHAR(50),
    schemename character varying(255) NOT NULL,
    status character varying(50) NOT NULL,
    applied_at timestamp without time zone DEFAULT now(),
    PRIMARY KEY (application_id)
);

CREATE TABLE mapping_requests (
    id UUID PRIMARY KEY,
    service_id TEXT NOT NULL UNIQUE,
    citizen_details JSONB NOT NULL,
    additional_proof TEXT,
    status TEXT NOT NULL,
    aadhaar_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE disputes (
    dispute_id UUID PRIMARY KEY,
    service_id TEXT NOT NULL,
    aadhaar_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    supporting_documents JSONB,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
