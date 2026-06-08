--
-- PostgreSQL database dump
--

\restrict 9L4jx1P69De5NoJBUcOdCLjC9HmJUmKJnBhT9u8svq2deOoZaNEfWcksnZF4Wvi

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: LogAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LogAction" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'IMPORT',
    'OTHER'
);


ALTER TYPE public."LogAction" OWNER TO postgres;

--
-- Name: LoginLogType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LoginLogType" AS ENUM (
    'LOGIN',
    'LOGOUT',
    'REFRESH',
    'REGISTER'
);


ALTER TYPE public."LoginLogType" OWNER TO postgres;

--
-- Name: MsgRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MsgRole" AS ENUM (
    'USER',
    'ASSISTANT'
);


ALTER TYPE public."MsgRole" OWNER TO postgres;

--
-- Name: OtcType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OtcType" AS ENUM (
    'OTC',
    'RX'
);


ALTER TYPE public."OtcType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: DictionaryItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DictionaryItem" (
    id integer NOT NULL,
    "typeId" integer NOT NULL,
    label text NOT NULL,
    value text NOT NULL,
    color text,
    "isEnabled" boolean DEFAULT true NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."DictionaryItem" OWNER TO postgres;

--
-- Name: DictionaryItem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."DictionaryItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DictionaryItem_id_seq" OWNER TO postgres;

--
-- Name: DictionaryItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."DictionaryItem_id_seq" OWNED BY public."DictionaryItem".id;


--
-- Name: DictionaryType; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DictionaryType" (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "isEnabled" boolean DEFAULT true NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."DictionaryType" OWNER TO postgres;

--
-- Name: DictionaryType_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."DictionaryType_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DictionaryType_id_seq" OWNER TO postgres;

--
-- Name: DictionaryType_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."DictionaryType_id_seq" OWNED BY public."DictionaryType".id;


--
-- Name: LoginLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LoginLog" (
    id integer NOT NULL,
    "userId" integer,
    username text,
    type public."LoginLogType" NOT NULL,
    ip text,
    "userAgent" text,
    success boolean DEFAULT true NOT NULL,
    message text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LoginLog" OWNER TO postgres;

--
-- Name: LoginLog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."LoginLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."LoginLog_id_seq" OWNER TO postgres;

--
-- Name: LoginLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."LoginLog_id_seq" OWNED BY public."LoginLog".id;


--
-- Name: Menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Menu" (
    id integer NOT NULL,
    name text NOT NULL,
    path text,
    icon text,
    component text,
    redirect text,
    "parentId" integer,
    "order" integer DEFAULT 0 NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    type text DEFAULT 'menu'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    permission text
);


ALTER TABLE public."Menu" OWNER TO postgres;

--
-- Name: Menu_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Menu_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Menu_id_seq" OWNER TO postgres;

--
-- Name: Menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Menu_id_seq" OWNED BY public."Menu".id;


--
-- Name: OperationLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OperationLog" (
    id integer NOT NULL,
    "userId" integer,
    username text,
    action public."LogAction" NOT NULL,
    module text,
    target text,
    "targetId" text,
    "targetType" text,
    description text,
    method text,
    path text,
    ip text,
    "userAgent" text,
    "statusCode" integer,
    duration integer,
    "requestBody" text,
    "oldValue" jsonb,
    "newValue" jsonb,
    response text,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OperationLog" OWNER TO postgres;

--
-- Name: OperationLog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."OperationLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."OperationLog_id_seq" OWNER TO postgres;

--
-- Name: OperationLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."OperationLog_id_seq" OWNED BY public."OperationLog".id;


--
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Role_id_seq" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SystemSetting" (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    value jsonb NOT NULL,
    category text,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SystemSetting" OWNER TO postgres;

--
-- Name: SystemSetting_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."SystemSetting_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SystemSetting_id_seq" OWNER TO postgres;

--
-- Name: SystemSetting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."SystemSetting_id_seq" OWNED BY public."SystemSetting".id;


--
-- Name: UploadRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UploadRecord" (
    id integer NOT NULL,
    "userId" integer,
    username text,
    "originalName" text NOT NULL,
    "storedName" text NOT NULL,
    "mimeType" text,
    size integer,
    bucket text,
    "objectKey" text,
    url text,
    module text,
    "refId" text,
    "refType" text,
    status text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UploadRecord" OWNER TO postgres;

--
-- Name: UploadRecord_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."UploadRecord_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."UploadRecord_id_seq" OWNER TO postgres;

--
-- Name: UploadRecord_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."UploadRecord_id_seq" OWNED BY public."UploadRecord".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    username text NOT NULL,
    email text,
    password text NOT NULL,
    name text,
    "avatarUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _RoleMenus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_RoleMenus" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE public."_RoleMenus" OWNER TO postgres;

--
-- Name: _UserRoles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_UserRoles" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE public."_UserRoles" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: agent_trace; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_trace (
    id text NOT NULL,
    session_id text,
    node_name text NOT NULL,
    input jsonb NOT NULL,
    output jsonb NOT NULL,
    llm_model text,
    token_in integer,
    token_out integer,
    latency_ms integer NOT NULL,
    error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.agent_trace OWNER TO postgres;

--
-- Name: app_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_user (
    id text NOT NULL,
    phone text,
    email text,
    nickname text,
    avatar_url text,
    status text DEFAULT 'active'::text NOT NULL,
    default_household_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(3) without time zone,
    username text,
    password_hash text,
    age integer,
    gender text,
    allergies text,
    medication_history text
);


ALTER TABLE public.app_user OWNER TO postgres;

--
-- Name: consultation_message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_message (
    id text NOT NULL,
    session_id text NOT NULL,
    role public."MsgRole" NOT NULL,
    content text NOT NULL,
    recommends jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.consultation_message OWNER TO postgres;

--
-- Name: consultation_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultation_session (
    id text NOT NULL,
    dev_user_id text,
    title text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id text,
    household_id text,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.consultation_session OWNER TO postgres;

--
-- Name: household; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.household (
    id text NOT NULL,
    name text NOT NULL,
    owner_user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(3) without time zone,
    code text NOT NULL
);


ALTER TABLE public.household OWNER TO postgres;

--
-- Name: household_medicine_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.household_medicine_inventory (
    id text NOT NULL,
    household_id text NOT NULL,
    medicine_id text,
    quantity integer DEFAULT 1 NOT NULL,
    expire_at date,
    source text,
    notes text,
    created_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(3) without time zone,
    name text NOT NULL,
    aliases text[] DEFAULT ARRAY[]::text[] NOT NULL,
    otc public."OtcType" NOT NULL,
    indication text NOT NULL,
    contraindication text,
    adverse_reaction text,
    dosage text,
    barcode text,
    approval_number text
);


ALTER TABLE public.household_medicine_inventory OWNER TO postgres;

--
-- Name: household_member; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.household_member (
    id text NOT NULL,
    household_id text NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    display_name text,
    joined_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.household_member OWNER TO postgres;

--
-- Name: medicine_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medicine_catalog (
    id text NOT NULL,
    name text NOT NULL,
    aliases text[] DEFAULT ARRAY[]::text[] NOT NULL,
    otc public."OtcType" NOT NULL,
    indication text NOT NULL,
    contraindication text,
    adverse_reaction text,
    dosage text,
    barcode text,
    approval_number text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.medicine_catalog OWNER TO postgres;

--
-- Name: user_medicine_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_medicine_inventory (
    id text NOT NULL,
    dev_user_id text NOT NULL,
    medicine_id text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    expire_at date,
    source text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_medicine_inventory OWNER TO postgres;

--
-- Name: DictionaryItem id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DictionaryItem" ALTER COLUMN id SET DEFAULT nextval('public."DictionaryItem_id_seq"'::regclass);


--
-- Name: DictionaryType id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DictionaryType" ALTER COLUMN id SET DEFAULT nextval('public."DictionaryType_id_seq"'::regclass);


--
-- Name: LoginLog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoginLog" ALTER COLUMN id SET DEFAULT nextval('public."LoginLog_id_seq"'::regclass);


--
-- Name: Menu id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Menu" ALTER COLUMN id SET DEFAULT nextval('public."Menu_id_seq"'::regclass);


--
-- Name: OperationLog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OperationLog" ALTER COLUMN id SET DEFAULT nextval('public."OperationLog_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: SystemSetting id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemSetting" ALTER COLUMN id SET DEFAULT nextval('public."SystemSetting_id_seq"'::regclass);


--
-- Name: UploadRecord id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UploadRecord" ALTER COLUMN id SET DEFAULT nextval('public."UploadRecord_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: DictionaryItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DictionaryItem" (id, "typeId", label, value, color, "isEnabled", sort, remark, "createdAt", "updatedAt", "deletedAt") FROM stdin;
1	1	启用	enabled	#18a058	t	1	\N	2026-05-22 01:33:42.971	2026-05-23 03:42:11.451	\N
2	1	停用	disabled	#d03050	t	2	\N	2026-05-22 01:33:42.977	2026-05-23 03:42:11.456	\N
3	2	是	true	#2080f0	t	1	\N	2026-05-22 01:33:42.982	2026-05-23 03:42:11.462	\N
4	2	否	false	#8a8a8a	t	2	\N	2026-05-22 01:33:42.99	2026-05-23 03:42:11.47	\N
\.


--
-- Data for Name: DictionaryType; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DictionaryType" (id, name, code, description, "isEnabled", sort, "createdAt", "updatedAt", "deletedAt") FROM stdin;
1	通用状态	common_status	通用启用/停用状态	t	1	2026-05-22 01:33:42.957	2026-05-23 03:42:11.43	\N
2	是否标识	boolean_flag	通用是否选项	t	2	2026-05-22 01:33:42.962	2026-05-23 03:42:11.438	\N
\.


--
-- Data for Name: LoginLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LoginLog" (id, "userId", username, type, ip, "userAgent", success, message, "createdAt") FROM stdin;
1	1	admin	LOGIN	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	t	\N	2026-05-22 01:40:38.311
2	1	admin	LOGIN	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	t	\N	2026-06-08 01:50:14.106
\.


--
-- Data for Name: Menu; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Menu" (id, name, path, icon, component, redirect, "parentId", "order", hidden, type, "createdAt", "updatedAt", "deletedAt", permission) FROM stdin;
100	新增用户	\N	\N	\N	\N	10	1	t	button	2026-05-22 01:33:42.801	2026-05-23 03:42:11.256	\N	system:user:create
101	编辑用户	\N	\N	\N	\N	10	2	t	button	2026-05-22 01:33:42.805	2026-05-23 03:42:11.263	\N	system:user:update
309	删除问诊日志	\N	\N	\N	\N	32	1	t	button	2026-05-22 03:53:40.863	2026-05-23 03:42:11.422	\N	family-doctor:consultation:delete
11	角色管理	/system/roles	material-symbols:groups-outline	views/system/roles/index	\N	1	2	f	menu	2026-05-22 01:33:42.727	2026-05-23 03:42:11.198	\N	system:role:view
12	菜单管理	/system/menus	material-symbols:menu	views/system/menus/index	\N	1	3	f	menu	2026-05-22 01:33:42.736	2026-05-23 03:42:11.205	\N	system:menu:view
13	系统配置	/system/settings	material-symbols:tune	views/system/settings/index	\N	1	4	f	menu	2026-05-22 01:33:42.744	2026-05-23 03:42:11.208	\N	system:setting:view
14	操作日志	/system/logs	material-symbols:history-rounded	views/system/logs/index	\N	1	5	f	menu	2026-05-22 01:33:42.752	2026-05-23 03:42:11.211	\N	system:log:view
15	上传记录	/system/upload-records	mdi:cloud-upload-outline	views/system/upload-records/index	\N	1	6	f	menu	2026-05-22 01:33:42.755	2026-05-23 03:42:11.214	\N	system:upload-record:view
16	字典管理	/system/dictionaries	material-symbols:format-list-bulleted	views/system/dictionaries/index	\N	1	7	f	menu	2026-05-22 01:33:42.758	2026-05-23 03:42:11.221	\N	system:dictionary:view
30	家庭医生	/family-doctor	material-symbols:medical-services-outline	\N	\N	\N	2	f	menu	2026-05-22 01:33:37.769	2026-05-23 03:42:11.229	\N	\N
31	家庭药品汇总	/family-doctor/medicines	material-symbols:pill-outline	views/family-doctor/household-medicines/index	\N	30	1	f	menu	2026-05-22 01:33:42.766	2026-05-23 03:42:11.237	\N	family-doctor:household-medicine:view
32	问诊日志	/family-doctor/consultations	material-symbols:chat-outline	views/family-doctor/consultations/index	\N	30	2	f	menu	2026-05-22 01:33:42.774	2026-05-23 03:42:11.245	\N	family-doctor:consultation:view
35	App 用户	/family-doctor/app-users	material-symbols:supervised-user-circle-outline	views/family-doctor/app-users/index	\N	30	3	f	menu	2026-05-22 01:33:37.776	2026-05-23 03:42:11.247	\N	family-doctor:app-user:view
33	家庭管理	/family-doctor/households	material-symbols:home-health-outline	views/family-doctor/households/index	\N	30	4	f	menu	2026-05-22 01:33:42.789	2026-05-23 03:42:11.25	\N	family-doctor:household:view
34	家庭药箱	/family-doctor/household-medicines	material-symbols:medication-outline	views/family-doctor/household-medicines/index	\N	30	5	f	menu	2026-05-22 01:33:42.797	2026-05-23 03:42:11.252	\N	family-doctor:household-medicine:view
102	删除用户	\N	\N	\N	\N	10	3	t	button	2026-05-22 01:33:42.807	2026-05-23 03:42:11.269	\N	system:user:delete
103	分配用户角色	\N	\N	\N	\N	10	4	t	button	2026-05-22 01:33:42.811	2026-05-23 03:42:11.276	\N	system:user:assign-roles
104	导出用户	\N	\N	\N	\N	10	5	t	button	2026-05-22 01:33:42.818	2026-05-23 03:42:11.283	\N	system:user:export
105	批量删除用户	\N	\N	\N	\N	10	6	t	button	2026-05-22 01:33:42.825	2026-05-23 03:42:11.286	\N	system:user:batch-delete
110	新增角色	\N	\N	\N	\N	11	1	t	button	2026-05-22 01:33:42.832	2026-05-23 03:42:11.289	\N	system:role:create
111	编辑角色	\N	\N	\N	\N	11	2	t	button	2026-05-22 01:33:42.839	2026-05-23 03:42:11.292	\N	system:role:update
112	删除角色	\N	\N	\N	\N	11	3	t	button	2026-05-22 01:33:42.841	2026-05-23 03:42:11.295	\N	system:role:delete
113	分配角色权限	\N	\N	\N	\N	11	4	t	button	2026-05-22 01:33:42.844	2026-05-23 03:42:11.301	\N	system:role:assign-menus
114	导出角色	\N	\N	\N	\N	11	5	t	button	2026-05-22 01:33:42.847	2026-05-23 03:42:11.308	\N	system:role:export
115	批量删除角色	\N	\N	\N	\N	11	6	t	button	2026-05-22 01:33:42.85	2026-05-23 03:42:11.315	\N	system:role:batch-delete
120	新增菜单	\N	\N	\N	\N	12	1	t	button	2026-05-22 01:33:42.857	2026-05-23 03:42:11.322	\N	system:menu:create
121	编辑菜单	\N	\N	\N	\N	12	2	t	button	2026-05-22 01:33:42.864	2026-05-23 03:42:11.325	\N	system:menu:update
122	删除菜单	\N	\N	\N	\N	12	3	t	button	2026-05-22 01:33:42.871	2026-05-23 03:42:11.327	\N	system:menu:delete
123	导出菜单	\N	\N	\N	\N	12	4	t	button	2026-05-22 01:33:42.878	2026-05-23 03:42:11.33	\N	system:menu:export
124	批量删除菜单	\N	\N	\N	\N	12	5	t	button	2026-05-22 01:33:42.881	2026-05-23 03:42:11.332	\N	system:menu:batch-delete
130	更新系统配置	\N	\N	\N	\N	13	1	t	button	2026-05-22 01:33:42.883	2026-05-23 03:42:11.339	\N	system:setting:update
140	新增字典类型	\N	\N	\N	\N	16	1	t	button	2026-05-22 01:33:42.886	2026-05-23 03:42:11.346	\N	system:dictionary:create
141	编辑字典类型	\N	\N	\N	\N	16	2	t	button	2026-05-22 01:33:42.889	2026-05-23 03:42:11.353	\N	system:dictionary:update
142	删除字典类型	\N	\N	\N	\N	16	3	t	button	2026-05-22 01:33:42.896	2026-05-23 03:42:11.361	\N	system:dictionary:delete
143	新增字典项	\N	\N	\N	\N	16	4	t	button	2026-05-22 01:33:42.903	2026-05-23 03:42:11.365	\N	system:dictionary:item:create
144	编辑字典项	\N	\N	\N	\N	16	5	t	button	2026-05-22 01:33:42.91	2026-05-23 03:42:11.368	\N	system:dictionary:item:update
145	删除字典项	\N	\N	\N	\N	16	6	t	button	2026-05-22 01:33:42.917	2026-05-23 03:42:11.371	\N	system:dictionary:item:delete
300	新增药品	\N	\N	\N	\N	31	1	t	button	2026-05-22 01:33:42.92	2026-05-23 03:42:11.375	\N	family-doctor:medicine:create
301	编辑药品	\N	\N	\N	\N	31	2	t	button	2026-05-22 01:33:42.922	2026-05-23 03:42:11.382	\N	family-doctor:medicine:update
302	删除药品	\N	\N	\N	\N	31	3	t	button	2026-05-22 01:33:42.925	2026-05-23 03:42:11.389	\N	family-doctor:medicine:delete
303	更新家庭药箱	\N	\N	\N	\N	34	1	t	button	2026-05-22 01:33:42.928	2026-05-23 03:42:11.395	\N	family-doctor:household-medicine:update
304	删除家庭药箱	\N	\N	\N	\N	34	2	t	button	2026-05-22 01:33:42.934	2026-05-23 03:42:11.403	\N	family-doctor:household-medicine:delete
305	启停 App 用户	\N	\N	\N	\N	35	1	t	button	2026-05-22 01:33:37.782	2026-05-23 03:42:11.407	\N	family-doctor:app-user:update
306	重置 App 用户密码	\N	\N	\N	\N	35	2	t	button	2026-05-22 01:33:37.782	2026-05-23 03:42:11.41	\N	family-doctor:app-user:reset-password
307	删除 App 用户	\N	\N	\N	\N	35	3	t	button	2026-05-22 03:53:40.847	2026-05-23 03:42:11.412	\N	family-doctor:app-user:delete
308	删除家庭	\N	\N	\N	\N	33	1	t	button	2026-05-22 03:53:40.858	2026-05-23 03:42:11.415	\N	family-doctor:household:delete
1	系统管理	/system	material-symbols:settings-outline	\N	\N	\N	1	f	menu	2026-05-22 01:33:42.711	2026-05-23 03:42:11.166	\N	\N
10	用户管理	/system/users	material-symbols:person-outline	views/system/users/index	\N	1	1	f	menu	2026-05-22 01:33:42.717	2026-05-23 03:42:11.182	\N	system:user:view
\.


--
-- Data for Name: OperationLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OperationLog" (id, "userId", username, action, module, target, "targetId", "targetType", description, method, path, ip, "userAgent", "statusCode", duration, "requestBody", "oldValue", "newValue", response, error, "createdAt") FROM stdin;
1	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/register	POST	/app/auth/register	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	65	{"username":"admin","password":"***","registrationCode":"REG2026"}	\N	{"password": "***", "username": "admin", "registrationCode": "REG2026"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE2MjU1LCJleHAiOjE3ODAwMjEwNTV9.1rMUbGCux7yxRQZCVBsMp-hZzStfLf7uVBeGA9XErN4","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE2MjU1LCJleHAiOjE3ODIwMDgyNTV9.RB0fB2K8S90O7X9tUurjTuZLr4cGJVRnlD31dnXQ1N4","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","defaultHouseholdId":null}}	\N	2026-05-22 02:17:35.847
2	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	16	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE2ODMyLCJleHAiOjE3ODAwMjE2MzJ9.d9_8SXGeou-gpi9bTlrzVMkNVgJbZnuRDzFDMDcU8x4","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE2ODMyLCJleHAiOjE3ODIwMDg4MzJ9.PKWG0mE9i9_rR4XD5pO0X0mxwK2FkyjYpWVh9VdKV54","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","defaultHouseholdId":"cmpgai6bv0001ykujj7cynnzt"}}	\N	2026-05-22 02:27:12.767
3	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/login	POST	/app/auth/login	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	401	9	{"username":"ankkaya","password":"***"}	\N	{"password": "***", "username": "ankkaya"}	\N	{"name":"UnauthorizedException","message":"用户名或密码错误","status":401,"response":{"message":"用户名或密码错误","error":"Unauthorized","statusCode":401}}	2026-05-22 02:27:27.224
4	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/login	POST	/app/auth/login	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	401	1	{"username":"ankkaya","password":"***"}	\N	{"password": "***", "username": "ankkaya"}	\N	{"name":"UnauthorizedException","message":"用户名或密码错误","status":401,"response":{"message":"用户名或密码错误","error":"Unauthorized","statusCode":401}}	2026-05-22 02:27:29.232
5	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/login	POST	/app/auth/login	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	56	{"username":"admin","password":"***"}	\N	{"password": "***", "username": "admin"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE2ODY5LCJleHAiOjE3ODAwMjE2Njl9._T9KdXL8WMUY4FSdFqGCrzrzfQ_rOIDo04Hgz0iP39M","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE2ODY5LCJleHAiOjE3ODIwMDg4Njl9.XhL3Ifq6DA025GNcOWzsi5eUGfuXgDs7EKdqn-2AMrg","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","defaultHouseholdId":"cmpgai6bv0001ykujj7cynnzt"}}	\N	2026-05-22 02:27:49.422
6	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	12	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE3NjU5LCJleHAiOjE3ODAwMjI0NTl9.CXxrNVxy3N1ChAM4NMRiSkE5y_BHKGYhDHEX37MH9tI","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE3NjU5LCJleHAiOjE3ODIwMDk2NTl9.uzXkBxYhBWF5Eq70lRf-FJCWT7pNZor07szZbg4oGr8","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","defaultHouseholdId":"cmpgai6bv0001ykujj7cynnzt"}}	\N	2026-05-22 02:40:59.088
7	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	10	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE3NjkyLCJleHAiOjE3ODAwMjI0OTJ9.SiKxQKLEcaVG2sWKRmmAbwv2NiN1cdKExDI1WIm6y6A","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE3NjkyLCJleHAiOjE3ODIwMDk2OTJ9.SBjxRMpKS7NY8mC5aQEStOnZ43StHHuyVcPHZM2zfkk","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","defaultHouseholdId":"cmpgai6bv0001ykujj7cynnzt"}}	\N	2026-05-22 02:41:32.082
8	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	15	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE3ODQzLCJleHAiOjE3ODAwMjI2NDN9.jAQkDfKyja9tuoyaRj3T9a-ENKIRqDxB16gBpgUcH3A","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDE3ODQzLCJleHAiOjE3ODIwMDk4NDN9._S4Y9Z_ZpzZdXQYC9YhqWNlBkEVJrjZLmEjza24dMcE","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","defaultHouseholdId":"cmpgai6bv0001ykujj7cynnzt"}}	\N	2026-05-22 02:44:03.148
9	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/register	POST	/app/auth/register	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	67	{"username":"admin1","password":"***","registrationCode":"REG2026"}	\N	{"password": "***", "username": "admin1", "registrationCode": "REG2026"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDIyMzU4LCJleHAiOjE3ODAwMjcxNTh9.EUxyYkZFhFC90DQ39gn5bkJ1idIwzG4IEYRVR2M-zKc","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDIyMzU4LCJleHAiOjE3ODIwMTQzNTh9.6xoCOsK-OYPjrzWQFruYJKKsaxNVbSNMdQaAufcJMzo","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","defaultHouseholdId":null}}	\N	2026-05-22 03:59:18.764
10	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/register	POST	/app/auth/register	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	61	{"username":"admin2","password":"***","registrationCode":"REG2026"}	\N	{"password": "***", "username": "admin2", "registrationCode": "REG2026"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTVmbXIwMDAzcGt1amhzZ2Y2bHJ6IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDIyMzk1LCJleHAiOjE3ODAwMjcxOTV9.kljQHmEkJW76S9yETQzCfsFyQ3ustwE5UsU81SSBW0c","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTVmbXIwMDAzcGt1amhzZ2Y2bHJ6IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDIyMzk1LCJleHAiOjE3ODIwMTQzOTV9.jsvKe4zipx2jAI0dBUwrtB-zlrOecEtrfXu5I6bNz8s","user":{"id":"cmpge5fmr0003pkujhsgf6lrz","username":"admin2","nickname":"admin2","defaultHouseholdId":null}}	\N	2026-05-22 03:59:55.495
11	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	71	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTVmbXIwMDAzcGt1amhzZ2Y2bHJ6IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDI1MjIxLCJleHAiOjE3ODAwMzAwMjF9.jNUVNXWq2bj-SGiDgel_Ro1ePla6xMMppaNK2WawTUs","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTVmbXIwMDAzcGt1amhzZ2Y2bHJ6IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDI1MjIxLCJleHAiOjE3ODIwMTcyMjF9.OfcP_eLeqOG-zOfy-Grr-6cDFNcYatE2XSfoLTVPfpA","user":{"id":"cmpge5fmr0003pkujhsgf6lrz","username":"admin2","nickname":"admin2","defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-22 04:47:01.712
12	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/login	POST	/app/auth/login	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	56	{"username":"admin1","password":"***"}	\N	{"password": "***", "username": "admin1"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDMwMTE2LCJleHAiOjE3ODAwMzQ5MTZ9.IAV0Pl6kU1mvXhUeFh5KRJUvuNgK7xaYf6Rspn5JfnE","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDMwMTE2LCJleHAiOjE3ODIwMjIxMTZ9.x3N7aMVPHzz6CX5GIKejibwh8Pxs0BMFhwqnnT5lAjs","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-22 06:08:36.14
13	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/login	POST	/app/auth/login	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; en-US) PowerShell/7.6.1	201	67	{"username":"local-dev","password":"***"}	\N	{"password": "***", "username": "local-dev"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2NhbC1kZXYtdXNlciIsInR5cCI6ImFwcCIsImlhdCI6MTc3OTQzMzMzNSwiZXhwIjoxNzgwMDM4MTM1fQ.Me5IV5-jouLBAaGdTKQ__6HUa5vprx0xEuAIbGI2UI8","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2NhbC1kZXYtdXNlciIsInR5cCI6ImFwcCIsImlhdCI6MTc3OTQzMzMzNSwiZXhwIjoxNzgyMDI1MzM1fQ.VY2shRG98bUmUbSaRtQBP1Dzm8cjsA8-wCj400bTMrU","user":{"id":"local-dev-user","username":"local-dev","nickname":"本地示例用户","defaultHouseholdId":"local-dev-household"}}	\N	2026-05-22 07:02:15.71
14	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/login	POST	/app/auth/login	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; en-US) PowerShell/7.6.1	201	58	{"password":"***","username":"local-dev"}	\N	{"password": "***", "username": "local-dev"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2NhbC1kZXYtdXNlciIsInR5cCI6ImFwcCIsImlhdCI6MTc3OTQzNTAyMSwiZXhwIjoxNzgwMDM5ODIxfQ.JEyDJSURbt0VQ2ejnsC9HwGk_z9ok_gT6Pc_Lo5XTZY","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2NhbC1kZXYtdXNlciIsInR5cCI6ImFwcCIsImlhdCI6MTc3OTQzNTAyMSwiZXhwIjoxNzgyMDI3MDIxfQ.TVfDwEnMs0lWey7-isAeKFsYAQjV9HSUJxTlEZe0ZKY","user":{"id":"local-dev-user","username":"local-dev","nickname":"本地示例用户","defaultHouseholdId":"local-dev-household"}}	\N	2026-05-22 07:30:21.711
15	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	7	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDM3OTI2LCJleHAiOjE3ODAwNDI3MjZ9.uKoY2LVuC9WqJSyZnJfclqMeZ5LAQRu2vGWPE2rkIPk","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDM3OTI2LCJleHAiOjE3ODIwMjk5MjZ9.v6jJ7PwgLabWyKUeiMWEgWQliHypkJYt5VYNHakd-mU","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-22 08:18:46.24
16	\N	admin1	CREATE	consultation	\N	\N	consultation	POST /consultation/ask	POST	/consultation/ask	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	6809	{"sessionId":"73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c","question":"你好"}	\N	{"question": "你好", "sessionId": "73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c"}	{"sessionId":"73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c","messageId":"61468c23-e93a-4ee1-af75-0b64f0c5f99d","answer":"您描述的症状不明确。请先观察具体表现，如发热、疼痛部位或不适特点。注意多饮水、充分休息。若出现持续高热、剧烈疼痛、呼吸困难或精神萎靡等情况，建议及时就医。","recommends":[],"disclaimer":"本回复为 AI 参考建议，不构成医疗诊断。症状持续或加重请尽快就医。"}	\N	2026-05-22 08:24:39.071
17	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	76	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDQzMTg3LCJleHAiOjE3ODAwNDc5ODd9.qxI3tBsxqMylD4ggb9qlrhLDxlHzqzVUkf1tkC8d_gU","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NDQzMTg3LCJleHAiOjE3ODIwMzUxODd9.pfF2q3bJErC0E-BNj-t1uO6bGnUBS_iWZT8yJJf2Hnk","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-22 09:46:27.263
18	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/login	POST	/app/auth/login	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	62	{"username":"admin1","password":"***"}	\N	{"password": "***", "username": "admin1"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTA1NTM3LCJleHAiOjE3ODAxMTAzMzd9.Dg_yJtre8VrcxPyA2-boap_qDulkVh5qT_-Dh9rVF-g","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTA1NTM3LCJleHAiOjE3ODIwOTc1Mzd9.0iG2VCdJfVPTN-nXXEC51wr_tK_UaZKCfdfp6bL0wUg","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-23 03:05:37.18
19	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	82	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	\N	{"name":"PrismaClientKnownRequestError","message":"\\nInvalid `this.prisma.appUser.findFirst()` invocation in\\nC:\\\\Users\\\\Ankkaya\\\\Projects\\\\family-doctor\\\\backend\\\\src\\\\domains\\\\app-auth\\\\app-auth.service.ts:175:44\\n\\n  172 \\n  173 async refresh(refreshToken: string) {\\n  174   const payload = await this.verifyRefreshToken(refreshToken);\\n→ 175   const user = await this.prisma.appUser.findFirst(\\nThe column `app_user.age` does not exist in the current database."}	2026-05-23 03:21:27.379
20	1	admin	DELETE	admin	\N	local-dev-household	admin	DELETE /admin/households/local-dev-household	DELETE	/admin/households/local-dev-household	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	200	20	\N	\N	\N	{"success":true}	\N	2026-05-23 06:15:12.694
21	1	admin	DELETE	admin	\N	local-dev-user	admin	DELETE /admin/app-users/local-dev-user	DELETE	/admin/app-users/local-dev-user	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	200	11	\N	\N	\N	{"success":true}	\N	2026-05-23 06:15:21.707
22	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/login	POST	/app/auth/login	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	56	{"username":"admin1","password":"***"}	\N	{"password": "***", "username": "admin1"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTE2OTMzLCJleHAiOjE3ODAxMjE3MzN9.cktaeN_onBM90uZce7I4yiAaO4SF5fbuB9BpEXY6ucc","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTE2OTMzLCJleHAiOjE3ODIxMDg5MzN9.yKLlYpngAdXMKpg8EQx1B8GO9IMj_vTuPmi2Rimhd-s","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","avatarUrl":null,"age":null,"gender":null,"allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-23 06:15:33.32
23	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	20	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTE3MDc3LCJleHAiOjE3ODAxMjE4Nzd9.Yc_po02xh_jTjtngU0P1iN233mxChFa8ixNOeFDCtqA","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTE3MDc3LCJleHAiOjE3ODIxMDkwNzd9.qRysKfAQJXa8OSbbKWQRwTgv4gW1GLhOzww6CpwCHaI","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","avatarUrl":null,"age":null,"gender":null,"allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-23 06:17:57.151
24	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	61	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTE5OTg4LCJleHAiOjE3ODAxMjQ3ODh9.Z2Pj_NkbbYxIG5kxu6GFY1KYv0DfZ7L_-Wf80_CppZo","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTE5OTg4LCJleHAiOjE3ODIxMTE5ODh9.MTj7eW3o52LJxoo2TrZMtwCKgQ9h8eybbjLTuL3C_bM","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","avatarUrl":null,"age":null,"gender":null,"allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-23 07:06:28.369
25	\N	admin1	CREATE	app	\N	\N	app	POST /app/auth/avatar	POST	/app/auth/avatar	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	33	{}	\N	{}	{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","avatarUrl":"http://localhost:13001/api/files/preview?filename=app%2Favatar%2Fcmpge4nac0000pkuje9cf8wex%2F1779520381428-avatar-1779520381094.png","age":null,"gender":null,"allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}	\N	2026-05-23 07:13:01.46
26	\N	admin1	UPDATE	app	\N	\N	app	PATCH /app/auth/profile	PATCH	/app/auth/profile	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	200	10	{"avatarUrl":"","age":null,"gender":"unknown","allergies":"","medicationHistory":""}	\N	{"age": null, "gender": "unknown", "allergies": "", "avatarUrl": "", "medicationHistory": ""}	{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","avatarUrl":null,"age":null,"gender":"unknown","allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}	\N	2026-05-23 07:13:13.023
27	\N	admin1	CREATE	app	\N	\N	app	POST /app/auth/avatar	POST	/app/auth/avatar	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	39	{}	\N	{}	{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","avatarUrl":"http://localhost:13001/api/files/preview?filename=app%2Favatar%2Fcmpge4nac0000pkuje9cf8wex%2F1779520453882-avatar-1779520453555.png","age":null,"gender":"unknown","allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}	\N	2026-05-23 07:14:13.92
28	\N	admin1	CREATE	consultation	\N	\N	consultation	POST /consultation/ask	POST	/consultation/ask	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	502	37	{"question":"你好"}	\N	{"question": "你好"}	\N	{"name":"BadGatewayException","message":"Agent 服务不可用: fetch failed","status":502,"response":{"message":"Agent 服务不可用: fetch failed","error":"Bad Gateway","statusCode":502}}	2026-05-23 07:22:30.053
29	\N	admin1	CREATE	consultation	\N	\N	consultation	POST /consultation/ask	POST	/consultation/ask	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	10375	{"question":"你好"}	\N	{"question": "你好"}	{"sessionId":"d1865319-77be-445d-94f4-b95bcabcbf8b","messageId":"4062cc18-2cc2-4f52-bdd1-890fe8049495","answer":"您好，由于目前症状不明确，我们无法提供具体的用药建议。请先注意休息、补充水分，并密切观察。如果症状持续或加重，建议您及时就医以便获得专业诊断。","recommends":[],"disclaimer":"本回复为 AI 参考建议，不构成医疗诊断。症状持续或加重请尽快就医。"}	\N	2026-05-23 07:31:50.147
30	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0	201	3	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTI2MzE4LCJleHAiOjE3ODAxMzExMTh9._eFxi8sxK_yce-NNFvKwYs1pKJddNWTXFxrXcIOXFag","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5NTI2MzE4LCJleHAiOjE3ODIxMTgzMTh9.nNKRJEyzjMNqmqcme6xHgbzimPnzJyvRv-UVlWna5Ak","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","avatarUrl":"http://localhost:13001/api/files/preview?filename=app%2Favatar%2Fcmpge4nac0000pkuje9cf8wex%2F1779520453882-avatar-1779520453555.png","age":null,"gender":"unknown","allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-23 08:51:58.897
31	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	201	85	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5Njc1MzUyLCJleHAiOjE3ODAyODAxNTJ9.-BySXbFJgNiLfwtdk8-OSeH_ZaKBM993a61BxDtUYi0","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnZTRuYWMwMDAwcGt1amU5Y2Y4d2V4IiwidHlwIjoiYXBwIiwiaWF0IjoxNzc5Njc1MzUyLCJleHAiOjE3ODIyNjczNTJ9.lAo31VjinYocB7lgaE9oXunlzF9T2TU_ZiA-dXP2W40","user":{"id":"cmpge4nac0000pkuje9cf8wex","username":"admin1","nickname":"admin1","avatarUrl":"http://localhost:13001/api/files/preview?filename=app%2Favatar%2Fcmpge4nac0000pkuje9cf8wex%2F1779520453882-avatar-1779520453555.png","age":null,"gender":"unknown","allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpge4v3p0001pkuj2y3zs151"}}	\N	2026-05-25 02:15:52.796
32	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/login	POST	/app/auth/login	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	201	44	{"username":"admin","password":"***"}	\N	{"password": "***", "username": "admin"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzgwODg0MDc0LCJleHAiOjE3ODE0ODg4NzR9.clRkxNwdbWWaMaOULitQROGxGG7jdUL6ioXDcqO7fGs","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzgwODg0MDc0LCJleHAiOjE3ODM0NzYwNzR9.zbffLGmaBIK8PXZhmEJPrqrbQCMsTejSPZZCnGfmumo","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","avatarUrl":null,"age":null,"gender":null,"allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpgai6bv0001ykujj7cynnzt"}}	\N	2026-06-08 02:01:14.59
33	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	201	15	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzgwODg0Mzg5LCJleHAiOjE3ODE0ODkxODl9.yKhyCzTHHpkuVFZvNOFnVIcM9S-U5MOSFD1LY18bifM","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzgwODg0Mzg5LCJleHAiOjE3ODM0NzYzODl9.uTKljjp1OthPS9TLHebjW4FFc9p33gf6a1cQ9uQlL-o","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","avatarUrl":null,"age":null,"gender":null,"allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpgai6bv0001ykujj7cynnzt"}}	\N	2026-06-08 02:06:29.016
34	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	201	9	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzgwODg0OTY2LCJleHAiOjE3ODE0ODk3NjZ9.ygPt_YVl2VlGvOJg1jZM85FYKTX1eErEUmuK1yjzfug","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzgwODg0OTY2LCJleHAiOjE3ODM0NzY5NjZ9.U8p7Kb5WHJmMxiT733pmeJLEDett72ya63rwVlF6cE0","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","avatarUrl":null,"age":null,"gender":null,"allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpgai6bv0001ykujj7cynnzt"}}	\N	2026-06-08 02:16:06.955
35	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	201	23	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzgwODg3NjUyLCJleHAiOjE3ODE0OTI0NTJ9.2IP-uNtXogGjjW-2fREkWgOli92Pzw7wBBl5WCO4x8c","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXBnYWh1OHcwMDAweWt1ajNqYnVjb3MwIiwidHlwIjoiYXBwIiwiaWF0IjoxNzgwODg3NjUyLCJleHAiOjE3ODM0Nzk2NTJ9.ynA_Aoi6nvsZz4TDvNddoT2tFfMSxd8Nu5vf_sIdIuQ","user":{"id":"cmpgahu8w0000ykuj3jbucos0","username":"admin","nickname":"admin","avatarUrl":null,"age":null,"gender":null,"allergies":null,"medicationHistory":null,"defaultHouseholdId":"cmpgai6bv0001ykujj7cynnzt"}}	\N	2026-06-08 03:00:52.678
36	\N	\N	CREATE	app	\N	\N	app	POST /app/auth/refresh	POST	/app/auth/refresh	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	201	98	{"refreshToken":"***"}	\N	{"refreshToken": "***"}	\N	{"name":"PrismaClientKnownRequestError","message":"\\nInvalid `this.prisma.appUser.findFirst()` invocation in\\nC:\\\\Users\\\\Ankkaya\\\\Projects\\\\family-doctor\\\\backend\\\\src\\\\domains\\\\app-auth\\\\app-auth.service.ts:179:44\\n\\n  176 \\n  177 async refresh(refreshToken: string) {\\n  178   const payload = await this.verifyRefreshToken(refreshToken);\\n→ 179   const user = await this.prisma.appUser.findFirst(\\nThe column `app_user.chronic_diseases` does not exist in the current database."}	2026-06-08 03:06:34.629
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, name, code, description, "createdAt", "updatedAt", "deletedAt") FROM stdin;
1	超级管理员	admin	拥有所有权限	2026-05-22 01:33:42.615	2026-05-22 01:33:42.615	\N
2	普通用户	user	基础权限	2026-05-22 01:33:42.624	2026-05-22 01:33:42.624	\N
\.


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SystemSetting" (id, key, name, value, category, description, "createdAt", "updatedAt") FROM stdin;
1	app_registration_policy	App 注册码策略	{"code": "REG2026", "enabled": true, "expiresAt": "2099-12-31T23:59:59+08:00", "maxActivations": 100, "usedActivations": 0}	app	App 用户注册时校验的系统注册码、激活上限和有效期	2026-05-22 01:33:37.756	2026-05-23 03:42:11.481
\.


--
-- Data for Name: UploadRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UploadRecord" (id, "userId", username, "originalName", "storedName", "mimeType", size, bucket, "objectKey", url, module, "refId", "refType", status, "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, username, email, password, name, "avatarUrl", "createdAt", "updatedAt", "deletedAt") FROM stdin;
1	admin	admin@platform.local	$2b$10$n4cQMIAr7ApmV8UMjwKthumQ4DAalM5aN6sZMJrQ8ff.HR/5cnK9.	系统管理员	\N	2026-05-22 01:33:42.697	2026-05-22 01:33:42.697	\N
\.


--
-- Data for Name: _RoleMenus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_RoleMenus" ("A", "B") FROM stdin;
100	1
101	1
309	1
11	1
12	1
13	1
14	1
15	1
16	1
30	1
31	1
32	1
35	1
33	1
34	1
102	1
103	1
104	1
105	1
110	1
111	1
112	1
113	1
114	1
115	1
120	1
121	1
122	1
123	1
124	1
130	1
140	1
141	1
142	1
143	1
144	1
145	1
300	1
301	1
302	1
303	1
304	1
305	1
306	1
307	1
308	1
1	1
10	1
\.


--
-- Data for Name: _UserRoles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_UserRoles" ("A", "B") FROM stdin;
1	1
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
8caf1b94-db25-4821-9ca6-22797be67d97	dfab5f479975f39784f877d7dc784ad938140e7b4c08e8ac4e359d7c48f849bf	2026-05-22 01:33:37.001517+00	20260513000000_init	\N	\N	2026-05-22 01:33:36.55007+00	1
96273fc2-5a4d-4f57-8cd7-f21793873194	1d1418f55f4add1da56aa8c0c997719af6009522b82f7127a9aca64d993b67fd	2026-05-22 01:33:37.031597+00	20260514000000_add_menu_permission	\N	\N	2026-05-22 01:33:37.003457+00	1
3b18eac7-7b26-4061-a726-a37ae314d3cc	d990158a5e7432bc0f5226aef3161bfefe740811b558c5117747efe5ee878f73	2026-05-22 01:33:37.190661+00	20260514010000_add_dictionaries	\N	\N	2026-05-22 01:33:37.033739+00	1
b9f70997-34fb-43e5-a815-142dd8fb8dee	20146cc11c6a97d0326bc8ce69f5d4c3acc2b6889a37d1515922f30ea48b27c5	2026-05-22 01:33:37.201672+00	20260519000000_remove_menu_always_show	\N	\N	2026-05-22 01:33:37.192937+00	1
4a726afb-4952-4a2b-ae8f-93b5e977b0ce	0f91120084db3c070f1e19d55c8ce18e1926ab60dd1cd417878f29073d7ddcf7	2026-05-22 01:33:37.33961+00	20260520000000_add_family_doctor	\N	\N	2026-05-22 01:33:37.207837+00	1
c4ccc627-dcae-436c-b45f-6784f2ae3da2	8cdc52944eeb1c11c72f27d830a919c6d7cdcdac3e6bdc04fbff2db147001853	2026-05-22 01:33:37.41071+00	20260520010000_add_user_medicine_inventory	\N	\N	2026-05-22 01:33:37.345465+00	1
33a7d16e-d7cf-4c64-bb4f-a55b0ee6a02f	e95bf9714cc0e300707fdb83c2b51d495b516b96434b084debc45b3e29cae347	2026-05-22 01:33:37.685091+00	20260520020000_add_household_isolation	\N	\N	2026-05-22 01:33:37.417322+00	1
b10c2030-7ddd-4898-ae30-da747d9fa2b6	363dea7849df2e7f47952d498a2937f43ef5ae37be441385c60e3d4edd7ca0d1	2026-05-22 01:33:37.759537+00	20260520030000_add_app_username_registration_household_code	\N	\N	2026-05-22 01:33:37.687065+00	1
8b494058-6929-48cd-83dc-e891e291ec68	47627dadb023470ade1b098e5f7bce3ef9fd53a4a5ee91226341143922224340	2026-05-22 01:33:37.792357+00	20260521000000_add_app_user_admin_menu	\N	\N	2026-05-22 01:33:37.761712+00	1
ad918ce7-ba9a-4b8e-9c69-34389ad6c5a2	b42bc35e7e15f5182ee6a0593640f01580af77d4adfae218a7f0afc13ffe3d0f	2026-05-22 01:33:37.835872+00	20260521000000_household_owned_medicines	\N	\N	2026-05-22 01:33:37.795148+00	1
384e6e60-3673-4730-9d6f-1b9d50b97210	ef3c7464dfb77959de7e9a4dd7c4d905c1ea0c299eb3a308955b8300f32cf901	2026-05-22 03:50:33.787719+00	20260522090000_add_consultation_deleted_at	\N	\N	2026-05-22 03:50:33.731135+00	1
5e15eef7-1d46-4cc0-a7a3-4f287991f148	2597c875a5cfea1820f1be2d2bf0416dfd563f0c93f011b99e7a0f948ee06ebc	2026-05-23 03:42:04.799059+00	20260523000000_add_app_user_profile	\N	\N	2026-05-23 03:42:04.782452+00	1
\.


--
-- Data for Name: agent_trace; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agent_trace (id, session_id, node_name, input, output, llm_model, token_in, token_out, latency_ms, error, created_at) FROM stdin;
c2ee52fe-79da-4c7a-82ab-70a7a16aa253	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	parse	{"question": "你好"}	{"duration": null, "severity": "mild", "symptoms": ["不适"], "emergency": false, "populationHints": []}	gpt-4o-mini	\N	\N	2	\N	2026-05-22 06:46:43.954
1a44aa5f-232a-40f5-bd25-e80b83a3e1a3	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	match	{"symptoms": ["不适"], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 06:46:43.96
d8c1109a-bc22-4971-8b5d-184a4383fc6e	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 06:46:43.963
a7d51867-50b4-4815-81d5-d4cc82e3c64b	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 37, "recommendCount": 0}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 06:46:43.966
42fda2b6-9d50-44f8-b66f-6381fa77fee5	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	parse	{"question": "123123"}	{"duration": null, "severity": "mild", "symptoms": ["不适"], "emergency": false, "populationHints": []}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 06:52:39.165
2aee2e49-a3d7-4709-867d-a42a794f1d1e	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	match	{"symptoms": ["不适"], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 06:52:39.17
689cc31f-5faa-4cc7-8009-5c3748896cce	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 06:52:39.173
8e28bb06-0730-412f-b66d-1fded74d19d3	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 37, "recommendCount": 0}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 06:52:39.18
167247d1-03aa-436d-9cde-17351be173c2	3dfb6582-f2f0-4853-abe1-fd41326f5cca	parse	{"question": "你好"}	{"duration": null, "severity": "mild", "symptoms": ["不适"], "emergency": false, "populationHints": []}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 07:00:42.996
94580221-bba9-4eac-9596-972447ee4180	3dfb6582-f2f0-4853-abe1-fd41326f5cca	match	{"symptoms": ["不适"], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 07:00:43.001
4135e247-f464-41b4-9a40-117db346533f	3dfb6582-f2f0-4853-abe1-fd41326f5cca	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 07:00:43.006
406024ef-743e-43cb-83c0-568881ac08c1	3dfb6582-f2f0-4853-abe1-fd41326f5cca	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 37, "recommendCount": 0}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 07:00:43.011
47a86b76-c755-4498-b25d-71b31826f9b6	c5df15f4-d9ec-4f38-969c-f41ec5b6ee26	parse	{"question": "头痛发热可以吃什么药"}	{"duration": null, "severity": "mild", "symptoms": ["头痛", "发热"], "emergency": false, "populationHints": []}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 07:02:15.74
dce44158-c828-4fc5-8d53-c7975e592d99	c5df15f4-d9ec-4f38-969c-f41ec5b6ee26	match	{"symptoms": ["头痛", "发热"], "medicineCount": 3}	{"count": 2, "candidateIds": ["hh-inv-local-dev-med-ibu", "hh-inv-local-dev-med-lhqw"]}	\N	\N	\N	0	\N	2026-05-22 07:02:15.748
ce9e54b5-4ed6-45ac-89fa-495dee377e2a	c5df15f4-d9ec-4f38-969c-f41ec5b6ee26	risk	{"candidateIds": ["hh-inv-local-dev-med-ibu", "hh-inv-local-dev-med-lhqw"], "populationHints": []}	{"count": 2}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 07:02:15.754
d65c1f61-3030-43b8-8ed3-19083db1f4a2	c5df15f4-d9ec-4f38-969c-f41ec5b6ee26	render	{"emergency": false, "recommendCount": 2}	{"answerLength": 37, "recommendCount": 2}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 07:02:15.76
9d44c3a9-b928-487c-83c5-b440c80cac0e	3dfb6582-f2f0-4853-abe1-fd41326f5cca	parse	{"question": "你好"}	{"duration": null, "severity": "mild", "symptoms": ["不适"], "emergency": false, "populationHints": []}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 07:17:32.63
a4a0ddf4-a827-44f8-a74f-837efb3eb781	3dfb6582-f2f0-4853-abe1-fd41326f5cca	match	{"symptoms": ["不适"], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 07:17:32.633
31286462-b5d1-4809-b843-89ff0e4aa65b	3dfb6582-f2f0-4853-abe1-fd41326f5cca	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 07:17:32.635
75c80ff8-2ee0-4358-a285-1e7187119290	3dfb6582-f2f0-4853-abe1-fd41326f5cca	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 37, "recommendCount": 0}	gpt-4o-mini	\N	\N	0	\N	2026-05-22 07:17:32.638
c612ad0a-43f6-43db-a39a-be047c5ebd59	f28a5223-9f4b-4c54-a52a-31ec796f1984	parse	{"question": "你好"}	{"duration": null, "severity": "unknown", "symptoms": [], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	790	\N	2026-05-22 07:30:39.729
901ba590-29e1-4448-a4c2-ea64ca35feb8	f28a5223-9f4b-4c54-a52a-31ec796f1984	match	{"symptoms": [], "medicineCount": 3}	{"count": 3, "candidateIds": ["hh-inv-local-dev-med-hxzq", "hh-inv-local-dev-med-lhqw", "hh-inv-local-dev-med-ibu"]}	\N	\N	\N	0	\N	2026-05-22 07:30:39.733
20b6b767-4c09-43af-bfab-dd4772854c24	f28a5223-9f4b-4c54-a52a-31ec796f1984	risk	{"candidateIds": ["hh-inv-local-dev-med-hxzq", "hh-inv-local-dev-med-lhqw", "hh-inv-local-dev-med-ibu"], "populationHints": []}	{"count": 3}	mimo-v2.5	\N	\N	8333	\N	2026-05-22 07:30:39.736
3401a4c6-3cdb-4763-91c1-118ccca10b13	f28a5223-9f4b-4c54-a52a-31ec796f1984	render	{"emergency": false, "recommendCount": 3}	{"answerLength": 67, "recommendCount": 3}	mimo-v2.5	\N	\N	8828	\N	2026-05-22 07:30:39.743
fba5163f-7b60-478e-a3c6-a8db07d42fb1	3dfb6582-f2f0-4853-abe1-fd41326f5cca	parse	{"question": "你好"}	{"duration": null, "severity": "unknown", "symptoms": [], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	1257	\N	2026-05-22 08:04:30.774
7d7a196d-b0ee-418c-89d3-1f19795c2c43	3dfb6582-f2f0-4853-abe1-fd41326f5cca	match	{"symptoms": [], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 08:04:30.777
be798d34-49a7-40d2-bee5-ad4594624b3b	3dfb6582-f2f0-4853-abe1-fd41326f5cca	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-22 08:04:30.78
a28a1232-95e9-4685-ab6f-c5f3a348d925	3dfb6582-f2f0-4853-abe1-fd41326f5cca	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 72, "recommendCount": 0}	mimo-v2.5	\N	\N	5529	\N	2026-05-22 08:04:30.788
08c0e29c-05bd-438e-9d4f-f3ca4989f617	3dfb6582-f2f0-4853-abe1-fd41326f5cca	parse	{"question": "你好"}	{"duration": null, "severity": "unknown", "symptoms": [], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	1334	\N	2026-05-22 08:12:41.863
3a492951-cb40-47a0-9bfb-ea9d1f9b1768	3dfb6582-f2f0-4853-abe1-fd41326f5cca	match	{"symptoms": [], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 08:12:41.871
436fae0b-30be-4338-a490-3ed5df8246b1	3dfb6582-f2f0-4853-abe1-fd41326f5cca	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-22 08:12:41.878
fd2c5d3d-476c-4a6d-95d8-1d8c9eedeb9b	3dfb6582-f2f0-4853-abe1-fd41326f5cca	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 63, "recommendCount": 0}	mimo-v2.5	\N	\N	5772	\N	2026-05-22 08:12:41.881
a0872585-6f4f-494a-966b-a2e5464e4533	3dfb6582-f2f0-4853-abe1-fd41326f5cca	parse	{"question": "我头疼，流鼻涕"}	{"duration": null, "severity": "unknown", "symptoms": ["头疼", "流鼻涕"], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	1049	\N	2026-05-22 08:12:55.919
e926f487-0b95-4a05-aec4-765d6e01d926	3dfb6582-f2f0-4853-abe1-fd41326f5cca	match	{"symptoms": ["头疼", "流鼻涕"], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 08:12:55.922
017be3b6-286e-42e9-a170-de63ea50836e	3dfb6582-f2f0-4853-abe1-fd41326f5cca	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-22 08:12:55.924
9f03e33f-f60b-4a98-b27a-8f13624f34be	3dfb6582-f2f0-4853-abe1-fd41326f5cca	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 65, "recommendCount": 0}	mimo-v2.5	\N	\N	3109	\N	2026-05-22 08:12:55.926
399a3972-c4b4-47e1-b925-45234d66571f	3dfb6582-f2f0-4853-abe1-fd41326f5cca	parse	{"question": "你好"}	{"duration": null, "severity": "unknown", "symptoms": [], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	820	\N	2026-05-22 08:13:58.418
b90ff98d-11e9-4aa9-a5b9-6a06941e079a	3dfb6582-f2f0-4853-abe1-fd41326f5cca	match	{"symptoms": [], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 08:13:58.454
da6af2b2-9352-4172-a1e5-f15343169798	3dfb6582-f2f0-4853-abe1-fd41326f5cca	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-22 08:13:58.488
4dbf4847-28ca-48cf-95bd-9387bc22a097	3dfb6582-f2f0-4853-abe1-fd41326f5cca	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 49, "recommendCount": 0}	mimo-v2.5	\N	\N	3768	\N	2026-05-22 08:13:58.522
c4851d29-776f-41b7-b4ae-7fa4b9985bfb	3dfb6582-f2f0-4853-abe1-fd41326f5cca	parse	{"question": "你好"}	{"duration": null, "severity": "unknown", "symptoms": [], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	791	\N	2026-05-22 08:18:36.215
89a5af48-0055-4c08-8fef-bb804f0fc2e7	3dfb6582-f2f0-4853-abe1-fd41326f5cca	match	{"symptoms": [], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 08:18:36.219
1a08b243-fbcd-4a29-95d4-856bf86731b1	3dfb6582-f2f0-4853-abe1-fd41326f5cca	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-22 08:18:36.221
23495213-70fd-45d8-8e8d-73a253264c34	3dfb6582-f2f0-4853-abe1-fd41326f5cca	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 61, "recommendCount": 0}	mimo-v2.5	\N	\N	4015	\N	2026-05-22 08:18:36.224
5ec7d9c0-8a3e-4e56-8240-0e73d0064139	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	parse	{"question": "你好"}	{"duration": null, "severity": "unknown", "symptoms": [], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	1182	\N	2026-05-22 08:18:58.299
0337a8cd-effb-4ed8-8c12-1203bde44f94	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	match	{"symptoms": [], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 08:18:58.308
a24c38fa-9b0d-44bb-8330-80176d353409	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-22 08:18:58.317
0ca111d5-ad58-4b33-9090-5336ca9a404a	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 87, "recommendCount": 0}	mimo-v2.5	\N	\N	4982	\N	2026-05-22 08:18:58.325
0e6a93fe-470c-41d5-8b41-8c22bacafb2f	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	parse	{"question": "我肚子疼"}	{"duration": null, "severity": "unknown", "symptoms": ["肚子疼"], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	843	\N	2026-05-22 08:19:07.356
45f49625-36ef-4b66-ae38-dd85fde44c16	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	match	{"symptoms": ["肚子疼"], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 08:19:07.36
463aa81b-7edb-47d8-891c-cd869afa6292	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-22 08:19:07.368
903964a8-d90d-418d-a6f1-bd16c82c0922	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 96, "recommendCount": 0}	mimo-v2.5	\N	\N	3090	\N	2026-05-22 08:19:07.375
2099b96f-d40d-4caf-9f14-67a60d8dfbe3	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	parse	{"question": "哈哈"}	{"duration": null, "severity": "unknown", "symptoms": [], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	1443	\N	2026-05-22 08:19:30.744
fe898e5a-c940-4d4e-97d3-d05fe3e87e64	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	match	{"symptoms": [], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 08:19:30.748
65eceaa0-3baa-41d1-b502-7fdb959f317c	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-22 08:19:30.757
ff3d12f9-fcaf-41c4-8d87-2dc21d9718d5	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 54, "recommendCount": 0}	mimo-v2.5	\N	\N	3375	\N	2026-05-22 08:19:30.766
c8d9e6e6-53e5-40e6-be69-734b4ed9cc29	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	parse	{"question": "你好"}	{"duration": null, "severity": "unknown", "symptoms": [], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	1367	\N	2026-05-22 08:24:39.048
745f77d3-96f3-4fe1-8d70-e5d4c0e20f40	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	match	{"symptoms": [], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-22 08:24:39.052
a26cd8b8-c0b3-496c-8029-656a85078730	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-22 08:24:39.054
c4acb283-fc02-4c82-a57f-27847ece573e	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 77, "recommendCount": 0}	mimo-v2.5	\N	\N	5385	\N	2026-05-22 08:24:39.057
2e6edb3b-e6bb-4b68-9c78-cca11492c696	d1865319-77be-445d-94f4-b95bcabcbf8b	parse	{"question": "你好"}	{"duration": null, "severity": "unknown", "symptoms": [], "emergency": false, "populationHints": []}	mimo-v2.5	\N	\N	6318	\N	2026-05-23 07:31:50.136
77492a36-e531-4951-9c8a-ac6789272830	d1865319-77be-445d-94f4-b95bcabcbf8b	match	{"symptoms": [], "medicineCount": 0}	{"count": 0, "candidateIds": []}	\N	\N	\N	0	\N	2026-05-23 07:31:50.141
f36930e1-2df3-4d1f-87ba-13de07eccd0e	d1865319-77be-445d-94f4-b95bcabcbf8b	risk	{"candidateIds": [], "populationHints": []}	{"count": 0}	mimo-v2.5	\N	\N	0	\N	2026-05-23 07:31:50.144
d91dcf1d-b4d4-482a-b6ed-8c26e1ce8e04	d1865319-77be-445d-94f4-b95bcabcbf8b	render	{"emergency": false, "recommendCount": 0}	{"answerLength": 71, "recommendCount": 0}	mimo-v2.5	\N	\N	3986	\N	2026-05-23 07:31:50.146
\.


--
-- Data for Name: app_user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_user (id, phone, email, nickname, avatar_url, status, default_household_id, created_at, updated_at, deleted_at, username, password_hash, age, gender, allergies, medication_history) FROM stdin;
cmpgahu8w0000ykuj3jbucos0	\N	\N	admin	\N	active	cmpgai6bv0001ykujj7cynnzt	2026-05-22 02:17:35.84	2026-05-22 02:17:51.504	\N	admin	$2b$10$zskQmLwgD4QDFbSL5PhqAetWz.gvdchEgfcFZZR99WIu4ajFxdjCS	\N	\N	\N	\N
cmpge5fmr0003pkujhsgf6lrz	\N	\N	admin2	\N	active	cmpge4v3p0001pkuj2y3zs151	2026-05-22 03:59:55.491	2026-05-22 04:00:00.385	\N	admin2	$2b$10$NKDGFwduDGV/CWsLcKJ13OvEZaIHGXngin.B812OfIP3wHUWN0xcW	\N	\N	\N	\N
local-dev-user	\N	\N	本地示例用户	\N	active	\N	2026-05-22 01:33:37.425	2026-05-23 06:15:21.697	2026-05-23 06:15:21.697	local-dev	$2b$10$Jo2jcKkswm1TyxsJZb4.geNTxaExinJbaLttK8U/SXDWOnjCe1UV2	\N	\N	\N	\N
cmpge4nac0000pkuje9cf8wex	\N	\N	admin1	http://localhost:13001/api/files/preview?filename=app%2Favatar%2Fcmpge4nac0000pkuje9cf8wex%2F1779520453882-avatar-1779520453555.png	active	cmpge4v3p0001pkuj2y3zs151	2026-05-22 03:59:18.756	2026-05-23 07:14:13.911	\N	admin1	$2b$10$5Wz5qfz7wQHzvkJH/gvh1.ro8pLI663ytmBdoaRFxh12/I/AAvBM2	\N	unknown	\N	\N
\.


--
-- Data for Name: consultation_message; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_message (id, session_id, role, content, recommends, created_at) FROM stdin;
aa4b8472-06d6-43a0-9830-ae8e0af974ad	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	USER	你好	\N	2026-05-22 06:46:43.848
51548c0c-5c8b-4e30-8902-d028f2c413ac	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	ASSISTANT	根据你描述的症状，优先关注对症缓解并注意补水休息；若持续或加重请及时就医。	[]	2026-05-22 06:46:43.946
5124bde5-18a2-499f-bb15-97e3e6fe0e7f	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	USER	123123	\N	2026-05-22 06:52:39.146
23e18b95-6694-4a89-aa3b-b60f9ee58fd0	bbd55634-4dc2-474b-8f1c-ea0493aedfe8	ASSISTANT	根据你描述的症状，优先关注对症缓解并注意补水休息；若持续或加重请及时就医。	[]	2026-05-22 06:52:39.163
afb78228-533d-4c32-b567-05b706c67f3d	3dfb6582-f2f0-4853-abe1-fd41326f5cca	USER	你好	\N	2026-05-22 07:00:42.983
e2b5512d-72f0-4bc7-8a9f-d1d15ce90b3a	3dfb6582-f2f0-4853-abe1-fd41326f5cca	ASSISTANT	根据你描述的症状，优先关注对症缓解并注意补水休息；若持续或加重请及时就医。	[]	2026-05-22 07:00:42.994
f66b59eb-f9ed-45c2-b430-d0c01b71b09f	c5df15f4-d9ec-4f38-969c-f41ec5b6ee26	USER	头痛发热可以吃什么药	\N	2026-05-22 07:02:15.725
42251de5-07f5-4177-83ba-a0374d4bf321	c5df15f4-d9ec-4f38-969c-f41ec5b6ee26	ASSISTANT	根据你描述的症状，优先关注对症缓解并注意补水休息；若持续或加重请及时就医。	[{"otc": "OTC", "name": "布洛芬缓释胶囊", "reason": "适应症与症状初步匹配", "warnings": ["请阅读说明书并关注禁忌人群"], "indication": "头痛、发热、肌肉酸痛的短期缓解", "medicineId": "hh-inv-local-dev-med-ibu"}, {"otc": "OTC", "name": "连花清瘟胶囊", "reason": "适应症与症状初步匹配", "warnings": ["请阅读说明书并关注禁忌人群"], "indication": "发热、咳嗽、咽干咽痛等上呼吸道不适", "medicineId": "hh-inv-local-dev-med-lhqw"}]	2026-05-22 07:02:15.734
245d3633-2bf0-4f70-9fb2-94a449257b82	3dfb6582-f2f0-4853-abe1-fd41326f5cca	USER	你好	\N	2026-05-22 07:17:32.613
d6f92024-8ee4-43d8-b025-182d9790c2c9	3dfb6582-f2f0-4853-abe1-fd41326f5cca	ASSISTANT	根据你描述的症状，优先关注对症缓解并注意补水休息；若持续或加重请及时就医。	[]	2026-05-22 07:17:32.628
8a39cc42-d3f1-47ee-bad6-13dc412c42c9	f28a5223-9f4b-4c54-a52a-31ec796f1984	USER	你好	\N	2026-05-22 07:30:21.748
293e1378-a6f6-444a-9273-ef6bd75e7651	f28a5223-9f4b-4c54-a52a-31ec796f1984	ASSISTANT	由于症状尚未明确，请提供具体症状以获取更准确的用药参考。日常请注意保持充足水分和充分休息，若症状持续或加重，建议及时就医咨询专业医生。	[{"otc": "OTC", "name": "藿香正气水", "reason": "藿香正气水适用于腹泻、恶心和胃肠型感冒不适，可缓解用户可能存在的相关症状。", "warnings": ["酒精敏感者禁用", "儿童及孕妇慎用", "可能出现口干、轻度胃部刺激"], "indication": "腹泻、恶心、胃肠型感冒不适", "medicineId": "hh-inv-local-dev-med-hxzq"}, {"otc": "OTC", "name": "连花清瘟胶囊", "reason": "连花清瘟胶囊适用于发热、咳嗽、咽干咽痛等上呼吸道不适症状。当前用户症状未知，但若存在上述上呼吸道不适，此药可对症治疗。", "warnings": ["风寒感冒者慎用，因为药性偏寒凉，可能加重风寒症状。", "孕妇慎用，因药物成分可能对胎儿有潜在影响。", "脾胃虚寒者慎用，因药性寒凉，可能引起或加重腹泻、胃痛等不适。", "不良反应包括偶见腹泻、胃胀、皮疹，使用期间如出现不适应及时停药并咨询医生。"], "indication": "发热、咳嗽、咽干咽痛等上呼吸道不适", "medicineId": "hh-inv-local-dev-med-lhqw"}, {"otc": "OTC", "name": "布洛芬缓释胶囊", "reason": "布洛芬缓释胶囊适用于头痛、发热和肌肉酸痛的短期缓解，但用户未提供具体症状，因此无法确认是否匹配。人群提示无特殊禁忌，但药品本身有特定禁忌人群。", "warnings": ["胃溃疡患者禁用", "消化道出血史患者禁用", "孕晚期人群慎用", "可能出现胃部不适、恶心、头晕等不良反应"], "indication": "头痛、发热、肌肉酸痛的短期缓解", "medicineId": "hh-inv-local-dev-med-ibu"}]	2026-05-22 07:30:39.725
c84749f7-4e3a-4a33-93ee-bbebe714a977	3dfb6582-f2f0-4853-abe1-fd41326f5cca	USER	你好	\N	2026-05-22 08:04:23.954
bbc94f72-ec39-44fd-9378-61d55e689514	3dfb6582-f2f0-4853-abe1-fd41326f5cca	ASSISTANT	您未提供具体症状，无法针对性推荐。请先明确症状（如发热、咳嗽等）及严重程度，再补充信息。当前建议多休息、适量饮水，若症状持续或加重，请及时就医。	[]	2026-05-22 08:04:30.771
2d2351fd-b82b-4e17-98cc-f5ab5fbb4493	3dfb6582-f2f0-4853-abe1-fd41326f5cca	USER	你好	\N	2026-05-22 08:12:34.735
e76c67c7-5b8f-445a-be52-082a23f88832	3dfb6582-f2f0-4853-abe1-fd41326f5cca	ASSISTANT	您的症状描述不明确，无法确定具体问题。请务必多补充水分、充分休息，若出现持续高烧、呼吸困难或症状加重，请立即就医寻求专业帮助。	[]	2026-05-22 08:12:41.855
2032ed9c-01a5-4d9a-ac93-770d2110f051	3dfb6582-f2f0-4853-abe1-fd41326f5cca	USER	我头疼，流鼻涕	\N	2026-05-22 08:12:51.745
d3ffbbe6-803c-4a67-8be4-bc66cdc1bdc0	3dfb6582-f2f0-4853-abe1-fd41326f5cca	ASSISTANT	根据您描述的头疼和流鼻涕症状，可能是普通感冒或过敏引起。请多注意休息和补充水分。如果症状持续加重、出现高烧或呼吸困难，请及时就医。	[]	2026-05-22 08:12:55.916
6d4c2b53-e66b-4610-8c19-9696eec6fe33	3dfb6582-f2f0-4853-abe1-fd41326f5cca	USER	你好	\N	2026-05-22 08:13:53.781
ba511fad-b6d2-4c84-a64c-3e1b6d92ef79	3dfb6582-f2f0-4853-abe1-fd41326f5cca	ASSISTANT	您的症状未明确描述。建议您多休息、适当补充水分。若症状持续或加重，或出现其他不适，请及时就医咨询。	[]	2026-05-22 08:13:58.385
a602fd04-cd0e-448f-9578-fdbbfe9a8674	3dfb6582-f2f0-4853-abe1-fd41326f5cca	USER	你好	\N	2026-05-22 08:18:31.387
3b494278-155e-40c9-ada6-4e6e393d0210	3dfb6582-f2f0-4853-abe1-fd41326f5cca	ASSISTANT	目前症状不明确，建议您先观察身体状况。请多喝水、保证休息，若出现持续不适或症状加重，请及时就医。健康第一，别忽视身体信号。	[]	2026-05-22 08:18:36.212
3d2980fc-e590-447f-9b07-ffe454487254	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	USER	你好	\N	2026-05-22 08:18:52.118
46584d44-8b6f-4046-8fff-61659b2d0f33	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	ASSISTANT	您提供的症状信息不明确，暂时无法针对性分析。请留意观察身体的具体变化，例如是否出现发热、疼痛或不适加重。请优先补充水分、注意休息，并建议您清晰描述症状后再次咨询，或及时就医。	[]	2026-05-22 08:18:58.294
5c0467dc-217c-447d-87b3-3812a2f18ba4	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	USER	我肚子疼	\N	2026-05-22 08:19:03.399
939e4794-a6e3-4324-955b-be2c9ccd0fb9	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	ASSISTANT	您目前有肚子疼的症状，原因可能多样，如饮食不当、消化不良等。建议注意腹部保暖，清淡饮食，多喝温水，充分休息。如出现剧烈疼痛、持续加重、伴发热呕吐或腹泻严重等情况，请及时就医检查，避免延误病情。	[]	2026-05-22 08:19:07.352
ccc64de9-90da-4a3d-9e12-dc3072be547b	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	USER	哈哈	\N	2026-05-22 08:19:25.906
e02d5034-f2ae-4870-a2da-66ece9729775	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	ASSISTANT	您未描述具体症状，我无法提供针对性建议。请补充症状详情，例如发热、疼痛或不适部位等，以便我为您提供参考信息。	[]	2026-05-22 08:19:30.741
f62aa171-3de8-44f1-ba07-e28557740646	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	USER	你好	\N	2026-05-22 08:24:32.263
61468c23-e93a-4ee1-af75-0b64f0c5f99d	73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	ASSISTANT	您描述的症状不明确。请先观察具体表现，如发热、疼痛部位或不适特点。注意多饮水、充分休息。若出现持续高热、剧烈疼痛、呼吸困难或精神萎靡等情况，建议及时就医。	[]	2026-05-22 08:24:39.045
7c9c4f8b-14f0-4238-b0e5-de13a2b9d5ad	e6ed7cf6-c84d-4c5a-b236-fc4f97fc7cca	USER	你好	\N	2026-05-23 07:22:30.02
00dfb239-3771-401c-b6f9-31d38735777c	d1865319-77be-445d-94f4-b95bcabcbf8b	USER	你好	\N	2026-05-23 07:31:39.778
4062cc18-2cc2-4f52-bdd1-890fe8049495	d1865319-77be-445d-94f4-b95bcabcbf8b	ASSISTANT	您好，由于目前症状不明确，我们无法提供具体的用药建议。请先注意休息、补充水分，并密切观察。如果症状持续或加重，建议您及时就医以便获得专业诊断。	[]	2026-05-23 07:31:50.127
\.


--
-- Data for Name: consultation_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultation_session (id, dev_user_id, title, created_at, user_id, household_id, deleted_at) FROM stdin;
bbd55634-4dc2-474b-8f1c-ea0493aedfe8	\N	你好	2026-05-22 06:46:43.839	cmpge4nac0000pkuje9cf8wex	cmpge4v3p0001pkuj2y3zs151	\N
3dfb6582-f2f0-4853-abe1-fd41326f5cca	\N	你好	2026-05-22 07:00:42.98	cmpge4nac0000pkuje9cf8wex	cmpge4v3p0001pkuj2y3zs151	\N
c5df15f4-d9ec-4f38-969c-f41ec5b6ee26	\N	头痛发热可以吃什么药	2026-05-22 07:02:15.722	local-dev-user	local-dev-household	2026-05-22 07:02:34.566
f28a5223-9f4b-4c54-a52a-31ec796f1984	\N	你好	2026-05-22 07:30:21.738	local-dev-user	local-dev-household	2026-05-22 07:30:39.855
73d60c4d-ec4a-4b3f-80bc-2dc262f9f80c	\N	你好	2026-05-22 08:18:52.113	cmpge4nac0000pkuje9cf8wex	cmpge4v3p0001pkuj2y3zs151	\N
e6ed7cf6-c84d-4c5a-b236-fc4f97fc7cca	\N	你好	2026-05-23 07:22:30.016	cmpge4nac0000pkuje9cf8wex	cmpge4v3p0001pkuj2y3zs151	\N
d1865319-77be-445d-94f4-b95bcabcbf8b	\N	你好	2026-05-23 07:31:39.775	cmpge4nac0000pkuje9cf8wex	cmpge4v3p0001pkuj2y3zs151	\N
\.


--
-- Data for Name: household; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.household (id, name, owner_user_id, created_at, updated_at, deleted_at, code) FROM stdin;
cmpgai6bv0001ykujj7cynnzt	奥利奥家族	cmpgahu8w0000ykuj3jbucos0	2026-05-22 02:17:51.499	2026-05-22 02:17:51.499	\N	0F4F85
cmpge4v3p0001pkuj2y3zs151	测试家庭	cmpge4nac0000pkuje9cf8wex	2026-05-22 03:59:28.885	2026-05-22 03:59:28.885	\N	477256
local-dev-household	本地示例家庭	local-dev-user	2026-05-22 01:33:37.425	2026-05-23 06:15:12.675	2026-05-23 06:15:12.675	FAD001
\.


--
-- Data for Name: household_medicine_inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.household_medicine_inventory (id, household_id, medicine_id, quantity, expire_at, source, notes, created_by, created_at, updated_at, deleted_at, name, aliases, otc, indication, contraindication, adverse_reaction, dosage, barcode, approval_number) FROM stdin;
hh-inv-local-dev-med-ibu	local-dev-household	med-ibu	1	2026-12-31	手动录入	家庭常备退热止痛药	local-dev-user	2026-05-22 01:33:43.059	2026-05-23 06:15:12.675	2026-05-23 06:15:12.675	布洛芬缓释胶囊	{布洛芬,退烧药,止痛药}	OTC	头痛、发热、肌肉酸痛的短期缓解	胃溃疡、消化道出血史、孕晚期人群慎用	可能出现胃部不适、恶心、头晕	请按说明书或药师指导使用	6901234567890	国药准字示例-布洛芬
hh-inv-local-dev-med-lhqw	local-dev-household	med-lhqw	1	2025-11-20	图片识别	示例库存	local-dev-user	2026-05-22 01:33:43.063	2026-05-23 06:15:12.675	2026-05-23 06:15:12.675	连花清瘟胶囊	{连花清瘟,上呼吸道不适}	OTC	发热、咳嗽、咽干咽痛等上呼吸道不适	风寒感冒者、孕妇及脾胃虚寒者慎用	偶见腹泻、胃胀、皮疹	请按说明书或药师指导使用	6923456789012	国药准字示例-连花清瘟
hh-inv-local-dev-med-hxzq	local-dev-household	med-hxzq	2	2026-08-05	条码录入	胃肠不适常备用药	local-dev-user	2026-05-22 01:33:43.066	2026-05-23 06:15:12.675	2026-05-23 06:15:12.675	藿香正气水	{藿香正气,胃肠型感冒}	OTC	腹泻、恶心、胃肠型感冒不适	酒精敏感者、儿童及孕妇慎用	可能出现口干、轻度胃部刺激	请按说明书或药师指导使用	6956789012345	国药准字示例-藿香正气水
\.


--
-- Data for Name: household_member; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.household_member (id, household_id, user_id, role, display_name, joined_at, deleted_at) FROM stdin;
cmpgai6bx0002ykujzdeziw4l	cmpgai6bv0001ykujj7cynnzt	cmpgahu8w0000ykuj3jbucos0	member	奥利奥家族	2026-05-22 02:17:51.501	\N
cmpge4v3r0002pkujh48h5wi2	cmpge4v3p0001pkuj2y3zs151	cmpge4nac0000pkuje9cf8wex	owner	测试家庭	2026-05-22 03:59:28.887	\N
cmpge5jef0004pkujud7i9rsq	cmpge4v3p0001pkuj2y3zs151	cmpge5fmr0003pkujhsgf6lrz	member	\N	2026-05-22 04:00:00.375	\N
local-dev-household-owner	local-dev-household	local-dev-user	owner	本地示例用户	2026-05-22 01:33:37.425	2026-05-23 06:15:12.675
\.


--
-- Data for Name: medicine_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.medicine_catalog (id, name, aliases, otc, indication, contraindication, adverse_reaction, dosage, barcode, approval_number, created_at, updated_at) FROM stdin;
med-ibu	布洛芬缓释胶囊	{布洛芬,退烧药,止痛药}	OTC	头痛、发热、肌肉酸痛的短期缓解	胃溃疡、消化道出血史、孕晚期人群慎用	可能出现胃部不适、恶心、头晕	请按说明书或药师指导使用	6901234567890	国药准字示例-布洛芬	2026-05-22 01:33:43.007	2026-05-23 03:42:11.492
med-lhqw	连花清瘟胶囊	{连花清瘟,上呼吸道不适}	OTC	发热、咳嗽、咽干咽痛等上呼吸道不适	风寒感冒者、孕妇及脾胃虚寒者慎用	偶见腹泻、胃胀、皮疹	请按说明书或药师指导使用	6923456789012	国药准字示例-连花清瘟	2026-05-22 01:33:43.015	2026-05-23 03:42:11.496
med-amx	阿莫西林胶囊	{阿莫西林,抗生素}	RX	细菌感染相关炎症的处方用药	青霉素过敏人群禁用	可能出现皮疹、腹泻、恶心	处方药，请遵医嘱使用	6945678901234	国药准字示例-阿莫西林	2026-05-22 01:33:43.018	2026-05-23 03:42:11.498
med-hxzq	藿香正气水	{藿香正气,胃肠型感冒}	OTC	腹泻、恶心、胃肠型感冒不适	酒精敏感者、儿童及孕妇慎用	可能出现口干、轻度胃部刺激	请按说明书或药师指导使用	6956789012345	国药准字示例-藿香正气水	2026-05-22 01:33:43.02	2026-05-23 03:42:11.5
\.


--
-- Data for Name: user_medicine_inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_medicine_inventory (id, dev_user_id, medicine_id, quantity, expire_at, source, notes, created_at, updated_at) FROM stdin;
inv-local-dev-med-ibu	local-dev	med-ibu	1	2026-12-31	手动录入	家庭常备退热止痛药	2026-05-22 01:33:43.023	2026-05-23 03:42:11.509
inv-local-dev-med-lhqw	local-dev	med-lhqw	1	2025-11-20	图片识别	示例库存	2026-05-22 01:33:43.026	2026-05-23 03:42:11.517
inv-local-dev-med-hxzq	local-dev	med-hxzq	2	2026-08-05	条码录入	胃肠不适常备用药	2026-05-22 01:33:43.033	2026-05-23 03:42:11.526
\.


--
-- Name: DictionaryItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."DictionaryItem_id_seq"', 4, true);


--
-- Name: DictionaryType_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."DictionaryType_id_seq"', 6, true);


--
-- Name: LoginLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LoginLog_id_seq"', 2, true);


--
-- Name: Menu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Menu_id_seq"', 1, false);


--
-- Name: OperationLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."OperationLog_id_seq"', 36, true);


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Role_id_seq"', 2, true);


--
-- Name: SystemSetting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."SystemSetting_id_seq"', 4, true);


--
-- Name: UploadRecord_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."UploadRecord_id_seq"', 1, false);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 1, true);


--
-- Name: DictionaryItem DictionaryItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DictionaryItem"
    ADD CONSTRAINT "DictionaryItem_pkey" PRIMARY KEY (id);


--
-- Name: DictionaryType DictionaryType_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DictionaryType"
    ADD CONSTRAINT "DictionaryType_pkey" PRIMARY KEY (id);


--
-- Name: LoginLog LoginLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoginLog"
    ADD CONSTRAINT "LoginLog_pkey" PRIMARY KEY (id);


--
-- Name: Menu Menu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Menu"
    ADD CONSTRAINT "Menu_pkey" PRIMARY KEY (id);


--
-- Name: OperationLog OperationLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OperationLog"
    ADD CONSTRAINT "OperationLog_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (id);


--
-- Name: UploadRecord UploadRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UploadRecord"
    ADD CONSTRAINT "UploadRecord_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _RoleMenus _RoleMenus_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_RoleMenus"
    ADD CONSTRAINT "_RoleMenus_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _UserRoles _UserRoles_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_UserRoles"
    ADD CONSTRAINT "_UserRoles_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: agent_trace agent_trace_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_trace
    ADD CONSTRAINT agent_trace_pkey PRIMARY KEY (id);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);


--
-- Name: consultation_message consultation_message_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_message
    ADD CONSTRAINT consultation_message_pkey PRIMARY KEY (id);


--
-- Name: consultation_session consultation_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_session
    ADD CONSTRAINT consultation_session_pkey PRIMARY KEY (id);


--
-- Name: household_medicine_inventory household_medicine_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.household_medicine_inventory
    ADD CONSTRAINT household_medicine_inventory_pkey PRIMARY KEY (id);


--
-- Name: household_member household_member_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.household_member
    ADD CONSTRAINT household_member_pkey PRIMARY KEY (id);


--
-- Name: household household_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.household
    ADD CONSTRAINT household_pkey PRIMARY KEY (id);


--
-- Name: medicine_catalog medicine_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicine_catalog
    ADD CONSTRAINT medicine_catalog_pkey PRIMARY KEY (id);


--
-- Name: user_medicine_inventory user_medicine_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_medicine_inventory
    ADD CONSTRAINT user_medicine_inventory_pkey PRIMARY KEY (id);


--
-- Name: DictionaryItem_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DictionaryItem_deletedAt_idx" ON public."DictionaryItem" USING btree ("deletedAt");


--
-- Name: DictionaryItem_isEnabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DictionaryItem_isEnabled_idx" ON public."DictionaryItem" USING btree ("isEnabled");


--
-- Name: DictionaryItem_sort_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DictionaryItem_sort_idx" ON public."DictionaryItem" USING btree (sort);


--
-- Name: DictionaryItem_typeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DictionaryItem_typeId_idx" ON public."DictionaryItem" USING btree ("typeId");


--
-- Name: DictionaryType_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DictionaryType_code_key" ON public."DictionaryType" USING btree (code);


--
-- Name: DictionaryType_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DictionaryType_deletedAt_idx" ON public."DictionaryType" USING btree ("deletedAt");


--
-- Name: DictionaryType_isEnabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DictionaryType_isEnabled_idx" ON public."DictionaryType" USING btree ("isEnabled");


--
-- Name: DictionaryType_sort_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DictionaryType_sort_idx" ON public."DictionaryType" USING btree (sort);


--
-- Name: LoginLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoginLog_createdAt_idx" ON public."LoginLog" USING btree ("createdAt");


--
-- Name: LoginLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoginLog_userId_idx" ON public."LoginLog" USING btree ("userId");


--
-- Name: Menu_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Menu_deletedAt_idx" ON public."Menu" USING btree ("deletedAt");


--
-- Name: Menu_permission_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Menu_permission_idx" ON public."Menu" USING btree (permission);


--
-- Name: OperationLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OperationLog_createdAt_idx" ON public."OperationLog" USING btree ("createdAt");


--
-- Name: OperationLog_module_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OperationLog_module_idx" ON public."OperationLog" USING btree (module);


--
-- Name: OperationLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OperationLog_userId_idx" ON public."OperationLog" USING btree ("userId");


--
-- Name: Role_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_code_key" ON public."Role" USING btree (code);


--
-- Name: Role_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Role_deletedAt_idx" ON public."Role" USING btree ("deletedAt");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: SystemSetting_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SystemSetting_key_key" ON public."SystemSetting" USING btree (key);


--
-- Name: UploadRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UploadRecord_createdAt_idx" ON public."UploadRecord" USING btree ("createdAt");


--
-- Name: UploadRecord_module_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UploadRecord_module_idx" ON public."UploadRecord" USING btree (module);


--
-- Name: UploadRecord_refId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UploadRecord_refId_idx" ON public."UploadRecord" USING btree ("refId");


--
-- Name: UploadRecord_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UploadRecord_userId_idx" ON public."UploadRecord" USING btree ("userId");


--
-- Name: User_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_deletedAt_idx" ON public."User" USING btree ("deletedAt");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: _RoleMenus_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_RoleMenus_B_index" ON public."_RoleMenus" USING btree ("B");


--
-- Name: _UserRoles_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_UserRoles_B_index" ON public."_UserRoles" USING btree ("B");


--
-- Name: agent_trace_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX agent_trace_created_at_idx ON public.agent_trace USING btree (created_at);


--
-- Name: agent_trace_session_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX agent_trace_session_id_created_at_idx ON public.agent_trace USING btree (session_id, created_at);


--
-- Name: app_user_default_household_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_user_default_household_id_idx ON public.app_user USING btree (default_household_id);


--
-- Name: app_user_deleted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_user_deleted_at_idx ON public.app_user USING btree (deleted_at);


--
-- Name: app_user_email_active_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX app_user_email_active_key ON public.app_user USING btree (email) WHERE ((email IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: app_user_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_user_email_idx ON public.app_user USING btree (email);


--
-- Name: app_user_phone_active_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX app_user_phone_active_key ON public.app_user USING btree (phone) WHERE ((phone IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: app_user_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_user_phone_idx ON public.app_user USING btree (phone);


--
-- Name: app_user_username_active_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX app_user_username_active_key ON public.app_user USING btree (username) WHERE ((username IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: app_user_username_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_user_username_idx ON public.app_user USING btree (username);


--
-- Name: consultation_message_session_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultation_message_session_id_created_at_idx ON public.consultation_message USING btree (session_id, created_at);


--
-- Name: consultation_session_deleted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultation_session_deleted_at_idx ON public.consultation_session USING btree (deleted_at);


--
-- Name: consultation_session_dev_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultation_session_dev_user_id_created_at_idx ON public.consultation_session USING btree (dev_user_id, created_at);


--
-- Name: consultation_session_household_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultation_session_household_id_created_at_idx ON public.consultation_session USING btree (household_id, created_at);


--
-- Name: consultation_session_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consultation_session_user_id_created_at_idx ON public.consultation_session USING btree (user_id, created_at);


--
-- Name: household_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX household_code_key ON public.household USING btree (code);


--
-- Name: household_deleted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_deleted_at_idx ON public.household USING btree (deleted_at);


--
-- Name: household_medicine_inventory_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_medicine_inventory_created_by_idx ON public.household_medicine_inventory USING btree (created_by);


--
-- Name: household_medicine_inventory_deleted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_medicine_inventory_deleted_at_idx ON public.household_medicine_inventory USING btree (deleted_at);


--
-- Name: household_medicine_inventory_expire_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_medicine_inventory_expire_at_idx ON public.household_medicine_inventory USING btree (expire_at);


--
-- Name: household_medicine_inventory_household_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_medicine_inventory_household_id_idx ON public.household_medicine_inventory USING btree (household_id);


--
-- Name: household_medicine_inventory_medicine_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_medicine_inventory_medicine_id_idx ON public.household_medicine_inventory USING btree (medicine_id);


--
-- Name: household_medicine_inventory_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_medicine_inventory_name_idx ON public.household_medicine_inventory USING btree (name);


--
-- Name: household_member_active_user_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX household_member_active_user_key ON public.household_member USING btree (household_id, user_id) WHERE (deleted_at IS NULL);


--
-- Name: household_member_deleted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_member_deleted_at_idx ON public.household_member USING btree (deleted_at);


--
-- Name: household_member_household_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_member_household_id_idx ON public.household_member USING btree (household_id);


--
-- Name: household_member_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_member_user_id_idx ON public.household_member USING btree (user_id);


--
-- Name: household_owner_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX household_owner_user_id_idx ON public.household USING btree (owner_user_id);


--
-- Name: medicine_catalog_barcode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX medicine_catalog_barcode_key ON public.medicine_catalog USING btree (barcode);


--
-- Name: medicine_catalog_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX medicine_catalog_name_idx ON public.medicine_catalog USING btree (name);


--
-- Name: user_medicine_inventory_dev_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_medicine_inventory_dev_user_id_idx ON public.user_medicine_inventory USING btree (dev_user_id);


--
-- Name: user_medicine_inventory_dev_user_id_medicine_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_medicine_inventory_dev_user_id_medicine_id_key ON public.user_medicine_inventory USING btree (dev_user_id, medicine_id);


--
-- Name: user_medicine_inventory_medicine_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_medicine_inventory_medicine_id_idx ON public.user_medicine_inventory USING btree (medicine_id);


--
-- Name: DictionaryItem DictionaryItem_typeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DictionaryItem"
    ADD CONSTRAINT "DictionaryItem_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES public."DictionaryType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Menu Menu_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Menu"
    ADD CONSTRAINT "Menu_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Menu"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _RoleMenus _RoleMenus_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_RoleMenus"
    ADD CONSTRAINT "_RoleMenus_A_fkey" FOREIGN KEY ("A") REFERENCES public."Menu"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _RoleMenus _RoleMenus_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_RoleMenus"
    ADD CONSTRAINT "_RoleMenus_B_fkey" FOREIGN KEY ("B") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserRoles _UserRoles_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_UserRoles"
    ADD CONSTRAINT "_UserRoles_A_fkey" FOREIGN KEY ("A") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserRoles _UserRoles_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_UserRoles"
    ADD CONSTRAINT "_UserRoles_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agent_trace agent_trace_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_trace
    ADD CONSTRAINT agent_trace_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.consultation_session(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: app_user app_user_default_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_default_household_id_fkey FOREIGN KEY (default_household_id) REFERENCES public.household(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: consultation_message consultation_message_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_message
    ADD CONSTRAINT consultation_message_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.consultation_session(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: consultation_session consultation_session_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_session
    ADD CONSTRAINT consultation_session_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.household(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: consultation_session consultation_session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultation_session
    ADD CONSTRAINT consultation_session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: household_medicine_inventory household_medicine_inventory_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.household_medicine_inventory
    ADD CONSTRAINT household_medicine_inventory_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: household_medicine_inventory household_medicine_inventory_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.household_medicine_inventory
    ADD CONSTRAINT household_medicine_inventory_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.household(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: household_medicine_inventory household_medicine_inventory_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.household_medicine_inventory
    ADD CONSTRAINT household_medicine_inventory_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_catalog(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: household_member household_member_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.household_member
    ADD CONSTRAINT household_member_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.household(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: household_member household_member_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.household_member
    ADD CONSTRAINT household_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: household household_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.household
    ADD CONSTRAINT household_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.app_user(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_medicine_inventory user_medicine_inventory_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_medicine_inventory
    ADD CONSTRAINT user_medicine_inventory_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine_catalog(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 9L4jx1P69De5NoJBUcOdCLjC9HmJUmKJnBhT9u8svq2deOoZaNEfWcksnZF4Wvi

