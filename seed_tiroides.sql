-- ============================================================
-- Insertar Tratamiento: TIROIDES con todos sus guiones Q&A
-- Ejecutar en Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
    v_clinica_id UUID;
    v_service_id UUID;
BEGIN
    -- 1. Obtener la clínica (Rangel Pereira)
    SELECT id INTO v_clinica_id FROM clinicas LIMIT 1;
    
    IF v_clinica_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ninguna clínica';
    END IF;

    -- 2. Insertar o actualizar el servicio "Tiroides"
    INSERT INTO services (clinica_id, name, price, description, keywords, greeting, scripts, support_material)
    VALUES (
        v_clinica_id,
        'Tiroides',
        487000,
        'Tratamiento especializado en tiroides con enfoque de medicina funcional e integral. Consulta en dos tiempos: primero con médico funcional y luego con la Dra. Rosalinda Pereira, endocrinóloga con más de 40 años de experiencia.',
        ARRAY['hipotiroidismo', 'hashimoto', 'tsh', 'tiroides', 'cansancio', 'metabolismo lento', 'energía'],
        'Gracias por comunicarte con la Clínica Rangel Pereira, soy Carolina, ¿cuál es tu nombre, desde qué ciudad nos contactas y cuál es el servicio de tu interés?',
        '[]'::jsonb,
        '[]'::jsonb
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_service_id;

    -- Si ya existía, buscarlo
    IF v_service_id IS NULL THEN
        SELECT id INTO v_service_id FROM services WHERE name = 'Tiroides' AND clinica_id = v_clinica_id LIMIT 1;
    END IF;

    IF v_service_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo crear ni encontrar el servicio Tiroides';
    END IF;

    -- 3. Insertar todos los guiones Q&A
    INSERT INTO service_knowledge (service_id, clinica_id, question, answer, sort_order, is_active) VALUES

    (v_service_id, v_clinica_id,
     'Quiero una cita / más información',
     'Con mucho gusto, ¿para qué tipo de servicio?',
     1, true),

    (v_service_id, v_clinica_id,
     'Tiroides / Hipotiroidismo',
     'Para orientarte mejor, ¿ya tienes un diagnóstico confirmado o estás en proceso de evaluación?',
     2, true),

    (v_service_id, v_clinica_id,
     'Tengo síntomas, pero no sé si es tiroides / mi caso es...',
     'Entiendo. Para analizar a profundidad este caso, es necesario el criterio de los médicos.',
     3, true),

    (v_service_id, v_clinica_id,
     'Quiero una cita con la Doctora Rosalinda',
     E'Te cuento cómo funciona nuestro proceso de atención:\n\n🏥 La Dra. Rosalinda Pereira, médica endocrinóloga con más de 40 años de experiencia, lidera un equipo especializado en medicina funcional, con un enfoque integral que busca la causa raíz de los problemas de salud.\n\nIntegramos temas como riesgo cardiovascular, colesterol, presión arterial, metabolismo, hormonas y mucho más. 🔬💊🩺\n\n📋 Por esta razón, la consulta se realiza en dos tiempos:\n1️⃣ Primero, con un médico funcional del equipo, quien abre tu historia clínica, revisa síntomas, antecedentes y estilo de vida, y prescribe el tratamiento.\n2️⃣ Luego, con la Dra. Rosalinda Pereira, una vez tengas los exámenes básicos, para ajustar y personalizar tu tratamiento según los resultados de tus análisis. 📊✅\n\n💰 El valor total del proceso (ambas consultas) es de $487.000 COP (aprox. 157 USD).\n\nPuedes realizarlo presencial en Bogotá o de forma virtual desde cualquier lugar.\n\n📅 ¿Te gustaría que revisemos juntos el mejor horario para ti?\nEstoy aquí para ayudarte a reservar tu espacio antes de que se ocupe 🤗',
     4, true),

    (v_service_id, v_clinica_id,
     '¿Cuánto vale la consulta?',
     '💰 El valor de la consulta es de $487.000 COP, equivalentes aproximadamente a 157 USD.',
     5, true),

    (v_service_id, v_clinica_id,
     '¿Cuánto dura la consulta?',
     'La primera consulta con tu Médico Funcional dura una hora y el día de tu cita con la Doctora Rosalinda dura 30 minutos.',
     6, true),

    (v_service_id, v_clinica_id,
     '¿Necesito exámenes?',
     'Para la primera consulta no es obligatorio, aunque es lo ideal, pero para la consulta con la Doctora Rosalinda sí es requisito contar al menos con estos exámenes con una antigüedad no superior a 2 meses.',
     7, true),

    (v_service_id, v_clinica_id,
     '¿Qué pasa después de la consulta?',
     E'Con gusto te explico 😊.\n\nDespués de la primera parte de la consulta, el médico especialista en medicina funcional te prescribe un tratamiento inicial enfocado en mejorar la sintomatología que estás presentando 💊.\n\nEn ese momento:\n✅ Sabes en qué consiste tu tratamiento\n✅ Conoces cuánto tiempo dura\n✅ Tienes claridad sobre el valor del tratamiento 💰\n✅ El plan se ajusta a tu tiempo y a tu presupuesto 📋\n\nTodo se organiza de manera personalizada, pensando siempre en tu bienestar y en que el proceso sea claro y manejable para ti 🤗.',
     8, true),

    (v_service_id, v_clinica_id,
     '¿La consulta es virtual o presencial?',
     E'La consulta se puede realizar tanto de manera presencial como virtual 🏥.\n\n💻 Consulta virtual: se realiza por plataformas como Zoom Meet.\n🏢 Consulta presencial: puedes asistir directamente a nuestras instalaciones si así lo prefieres.\n\nAmbas modalidades permiten una valoración completa, detallada y personalizada, cuidando siempre tu comodidad y bienestar 🤗💚.',
     9, true),

    (v_service_id, v_clinica_id,
     'Pago / ¿Cómo puedo pagar?',
     E'Con gusto te comparto las opciones de pago disponibles para tu consulta:\n\n💳 Pago en línea (Colombia):\nPuedes cancelar con tarjeta débito, crédito o PSE a través de nuestro link de Credibanco:\n🔗 https://www.clinicarangelpereira.com/credibanco/\n\n🌎 Pago desde el exterior:\nTambién contamos con link de pago en dólares con tarjeta débito o crédito (Visa, MasterCard, American Express) y PayPal.\n👉 Solo indícanos y con gusto te enviamos el link correspondiente 😊\n\n🏦 Consignación o transferencia bancaria:\nBancolombia\nCuenta corriente: 03301180957\nA nombre de: Clínica Rangel Pereira\nNIT: 830028116-9\nSWIFT: COLOCOBMXXX\n\nDavivienda\nCuenta corriente: 0010 9031 7026\nA nombre de: Clínica Rangel Pereira\nNIT: 830028116',
     10, true),

    (v_service_id, v_clinica_id,
     '¿Tienen convenio con prepagada o aseguradora?',
     E'Actualmente no contamos con convenios con medicina prepagada ni con pólizas 🏥, ya que somos una IPS completamente independiente.\n\nSin embargo, algunos pacientes realizan el pago de manera particular y posteriormente presentan la factura directamente a su póliza para solicitar el reembolso, en caso de que su plan cubra consultas especializadas 📄💰. Esto ya depende de las condiciones de cada aseguradora.',
     11, true),

    (v_service_id, v_clinica_id,
     'Datos para el agendamiento de la cita',
     E'Por favor, ayúdanos con la siguiente información para crear o actualizar tus datos en nuestro sistema 📋\n\n• Nombres y apellidos completos\n• Número de identificación (cédula, ID, licencia de conducción o pasaporte)\n• Fecha de nacimiento\n• Correo electrónico\n• Dirección de domicilio\n• EPS (en Colombia) o seguro médico (en caso de ser Colombiano)\n• Ocupación\n• ¿Cómo te enteraste de la Clínica?',
     12, true),

    (v_service_id, v_clinica_id,
     '¿Qué fechas/horarios están disponibles?',
     E'Trabajamos de lunes a sábado 📅 y, para poder indicarte fechas y horarios disponibles, necesitamos conocer primero qué horario se adapta mejor a ti 😊:\n🕐 si prefieres la consulta en la mañana o en la tarde.\n\nContamos con especialistas que atienden tanto de manera presencial como virtual 💻, por lo que la disponibilidad puede variar según el horario que elijas. Con base en tu preferencia, revisamos la agenda del especialista para la primera parte de la consulta y te confirmamos las opciones disponibles 📋.',
     13, true),

    (v_service_id, v_clinica_id,
     '¿Ustedes curan el hipotiroidismo?',
     'Más que hablar de "cura", nuestro enfoque es ayudarte a mejorar el funcionamiento del metabolismo y reducir los síntomas, abordando la causa de fondo. Muchos pacientes logran mejorar energía, peso y calidad de vida.',
     14, true),

    (v_service_id, v_clinica_id,
     'Ya estoy en un tratamiento con Endocrinólogo, pero quiero una segunda opinión',
     E'Claro 😊, entiendo que te interese un enfoque endocrinológico, y eso justamente es lo que aplicamos 🩺.\n\nNuestros médicos siguen los protocolos de la Dra. Rosalinda Pereira, endocrinóloga especialista en tiroides, pero con una mirada funcional que busca no solo regular las hormonas, sino también sanar la causa de fondo 🔬💊.',
     15, true),

    (v_service_id, v_clinica_id,
     '¿Puedo pagar la consulta en dos partes?',
     E'Aunque la consulta se realiza en dos momentos diferentes, el proceso corresponde a una sola consulta integral, por lo cual se genera una única factura por el valor total 📄.\n\nEstos dos momentos se realizan para poder ofrecerte una valoración completa y un concepto integral 🩺📋: primero desde medicina funcional y luego desde el enfoque endocrino con la doctora Rosalinda, trabajando en conjunto por tu bienestar.\n\nPor esta razón, no es posible realizar el pago en dos partes 🙏.',
     16, true);

    RAISE NOTICE 'Servicio Tiroides creado con ID: %. Se insertaron 16 guiones Q&A.', v_service_id;
END $$;
