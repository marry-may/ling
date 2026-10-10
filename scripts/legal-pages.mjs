// Generates public/legal/<es|en|uk|ru>/{terms,privacy,refund,cookies,notice}.html: the documents Spanish and EU law
// require from an online seller (LSSI-CE, consumer law, GDPR) and that Stripe checks; the paywall and the landing footer
// link to them. The Spanish version is the reference one. Edit the texts and the seller details here, then run
// `npm run legal`.
import fs from 'node:fs'

/** The seller is the holder of the Stripe account: these details must match it. */
const SELLER = {
  name: 'Mariia Syrovatka',
  nie: '[NIE]',
  address: 'Calle D. Juan Antonio Baldovi 15, 8B, 03502 Benidorm (Alicante), España',
}
const EMAIL = 'hi@ling.uno'
const MAIL = `<a href="mailto:${EMAIL}">${EMAIL}</a>`
const SITE = 'ling.uno'
const LANGUAGES = ['es', 'en', 'uk', 'ru']
const PAGES = ['terms', 'privacy', 'refund', 'cookies', 'notice']
/** Lets a visitor switch the visit statistics off; src/analytics.ts and the library pages read the same key. */
const NO_STATS_KEY = 'ling-no-stats'

const TEXT = {
  es: {
    updated: 'Actualizado el 10 de octubre de 2026',
    nav: { terms: 'Condiciones', privacy: 'Privacidad', refund: 'Cancelación y reembolsos', cookies: 'Cookies', notice: 'Aviso legal' },
    titles: {
      terms: 'Condiciones generales de contratación',
      privacy: 'Política de privacidad',
      refund: 'Cancelación, desistimiento y reembolsos',
      cookies: 'Política de cookies y almacenamiento local',
      notice: 'Aviso legal',
    },
    stats: { on: 'Las estadísticas de visitas están activadas en este navegador.', off: 'Las estadísticas de visitas están desactivadas en este navegador.', disable: 'Desactivar estadísticas', enable: 'Activar estadísticas' },
    terms: () => `
<p>Estas condiciones regulan el uso del servicio Ling (${SITE} y la aplicación Ling; en adelante, el «Servicio») y la contratación de la suscripción de pago. Al crear una cuenta o contratar la suscripción las aceptas. Antes de pagar puedes leerlas, guardarlas e imprimirlas.</p>
<h2>1. Quién presta el Servicio</h2>
<p>${SELLER.name}, NIE ${SELLER.nie}, con domicilio en ${SELLER.address} (el «Prestador»). Correo electrónico: ${MAIL}.</p>
<h2>2. Qué es Ling</h2>
<p>2.1. Ling es un servicio en línea para leer libros en idiomas extranjeros con traducción de palabras, guardar palabras, repasarlas y estudiar gramática.</p>
<p>2.2. Sin suscripción puedes leer gratis las 5 primeras páginas de cada libro y usar el diccionario, los repasos y las lecciones de gramática. La suscripción da acceso a todos los libros completos durante el periodo contratado.</p>
<p>2.3. El Servicio es contenido y servicio digital que se presta en línea. Necesitas una cuenta, conexión a internet y un navegador actual o la aplicación Ling. El acceso de pago se activa en cuanto se confirma el pago.</p>
<h2>3. Cuenta y edad</h2>
<p>3.1. Para crear una cuenta debes tener al menos 14 años. Para contratar la suscripción debes ser mayor de edad o contar con la autorización de tus padres o tutores.</p>
<p>3.2. Eres responsable de mantener tu acceso a la cuenta en secreto. La cuenta es personal.</p>
<h2>4. Precio y pago</h2>
<p>4.1. Suscripción mensual: 5 €. Suscripción anual: 39 €. Los precios incluyen el IVA y cualquier otro impuesto aplicable. No hay gastos adicionales.</p>
<p>4.2. El pago se realiza en la página de pago segura de Stripe (Stripe Payments Europe, Ltd., Irlanda) con los medios que se muestran allí (tarjeta bancaria y, según el dispositivo, Apple Pay o Google Pay). El Prestador no recibe ni guarda los datos de tu tarjeta.</p>
<p>4.3. El contrato queda celebrado cuando el pago se confirma. Recibirás la confirmación del pago por correo electrónico; estas condiciones están siempre disponibles en esta página.</p>
<h2>5. Duración, renovación y cancelación</h2>
<p>5.1. La suscripción se renueva automáticamente por periodos iguales (un mes o un año) hasta que la canceles. El importe de cada nuevo periodo se cobra el día en que empieza.</p>
<p>5.2. Puedes cancelar la renovación en cualquier momento, sin coste ni penalización, en tu cuenta (sección «Suscripción») o escribiendo a ${MAIL}. Conservas el acceso hasta el final del periodo ya pagado.</p>
<p>5.3. Si cambia el precio, te avisaremos por correo electrónico al menos 30 días antes de la renovación a la que se aplique. Si no estás de acuerdo, puedes cancelar antes de esa fecha.</p>
<h2>6. Derecho de desistimiento</h2>
<p>6.1. Como consumidor, tienes derecho a desistir del contrato en un plazo de 14 días naturales desde su celebración (el pago de tu primera suscripción), sin indicar el motivo y sin ningún coste. Aunque el acceso empieza de inmediato, te devolveremos el importe íntegro.</p>
<p>6.2. Cómo ejercerlo, el plazo de devolución y el formulario modelo están en <a href="refund.html">Cancelación, desistimiento y reembolsos</a>.</p>
<h2>7. Garantía de conformidad</h2>
<p>7.1. El Prestador responde de que el Servicio sea conforme con lo contratado durante todo el periodo de suscripción, según el Real Decreto Legislativo 1/2007 (Ley General para la Defensa de los Consumidores y Usuarios). Si algo no funciona como debe, escríbenos: lo repararemos en un plazo razonable y, si no es posible, podrás pedir una reducción del precio o resolver el contrato.</p>
<h2>8. Uso del Servicio</h2>
<p>8.1. El Servicio es para uso personal y no comercial. No está permitido copiar o redistribuir los libros de la biblioteca de Ling fuera del Servicio, intentar acceder sin autorización a sistemas o cuentas ajenas, ni usar el Servicio de forma que perjudique su funcionamiento.</p>
<p>8.2. Los libros que subas deben ser tuyos o debes tener derecho a usarlos. Solo tú puedes verlos.</p>
<p>8.3. Las traducciones de palabras se generan automáticamente y pueden no ser exactas.</p>
<p>8.4. Si incumples gravemente estas condiciones podremos suspender tu cuenta tras avisarte, salvo que la ley exija actuar de inmediato. Si se resuelve el contrato por causa no imputable a ti, te devolveremos la parte proporcional del periodo pagado.</p>
<h2>9. Disponibilidad y responsabilidad</h2>
<p>9.1. Trabajamos para que el Servicio funcione sin interrupciones, pero puede haber pausas por mantenimiento o fallos técnicos; intentaremos que sean breves.</p>
<p>9.2. Nada en estas condiciones limita los derechos que te reconoce la normativa de protección de los consumidores.</p>
<h2>10. Códigos promocionales</h2>
<p>10.1. El Prestador puede ofrecer acceso gratuito con códigos promocionales. Cada código indica su duración; no son canjeables por dinero.</p>
<h2>11. Compras en la aplicación para iPhone y iPad</h2>
<p>11.1. Si contratas la suscripción dentro de la aplicación de iOS, el cobro lo realiza Apple según sus condiciones. En ese caso la renovación, la cancelación y los reembolsos se gestionan en los ajustes de tu Apple ID.</p>
<h2>12. Cambios en estas condiciones</h2>
<p>12.1. Podemos actualizar estas condiciones por cambios legales o del Servicio. Te avisaremos por correo electrónico de los cambios importantes con al menos 30 días de antelación; no afectan al periodo que ya hayas pagado. Si no estás de acuerdo, puedes cancelar la suscripción.</p>
<h2>13. Atención al cliente y reclamaciones</h2>
<p>13.1. Para cualquier consulta, incidencia o reclamación escribe a ${MAIL}. Responderemos lo antes posible y, como máximo, en un mes.</p>
<p>13.2. Hay hojas de reclamaciones a tu disposición: pídelas en ${MAIL}. También puedes acudir a la oficina de consumo de tu municipio o comunidad autónoma. El Prestador no está adherido a ningún sistema de resolución alternativa de litigios.</p>
<h2>14. Ley aplicable y tribunales</h2>
<p>14.1. Estas condiciones se rigen por la ley española. Como consumidor, puedes acudir a los tribunales de tu domicilio, y conservas la protección que te otorguen las normas imperativas de tu país de residencia.</p>
<p>14.2. Estas condiciones están disponibles en español, inglés, ucraniano y ruso. La versión de referencia es la española; cualquier duda de interpretación se resolverá a tu favor.</p>`,
    privacy: () => `
<p>Esta política explica qué datos personales trata Ling (${SITE} y la aplicación Ling), para qué y con qué derechos cuentas, conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).</p>
<h2>1. Responsable del tratamiento</h2>
<p>${SELLER.name}, NIE ${SELLER.nie}, ${SELLER.address}. Correo electrónico: ${MAIL}.</p>
<h2>2. Qué datos tratamos, para qué y con qué base</h2>
<ul>
<li><strong>Cuenta</strong>: tu correo electrónico y los datos de inicio de sesión. Para darte acceso al Servicio. Base: ejecución del contrato (art. 6.1.b RGPD).</li>
<li><strong>Tu contenido</strong>: libros que subes, palabras guardadas, progreso de lectura y ajustes. Para guardarlos y sincronizarlos entre tus dispositivos. Base: ejecución del contrato.</li>
<li><strong>Suscripción y pagos</strong>: plan, fechas, estado y los identificadores de cliente, pago y suscripción de Stripe. Los datos de la tarjeta los trata Stripe; nosotros no los recibimos. Para dar acceso de pago y cumplir obligaciones contables y fiscales. Base: ejecución del contrato y obligación legal (art. 6.1.c RGPD).</li>
<li><strong>Estadísticas de visitas</strong>: un identificador aleatorio guardado en tu navegador, la página visitada, la web de procedencia, el tipo de dispositivo (móvil u ordenador) y, si has iniciado sesión, tu cuenta. Para saber cuánto se usa el Servicio y mejorarlo. Base: interés legítimo (art. 6.1.f RGPD). Puedes oponerte en cualquier momento en la <a href="cookies.html">política de cookies</a>.</li>
<li><strong>Comunicaciones</strong>: los mensajes que nos envías. Para responderte. Base: ejecución del contrato o interés legítimo.</li>
</ul>
<p>No vendemos tus datos, no los usamos para publicidad y no tomamos decisiones automatizadas ni elaboramos perfiles sobre ti.</p>
<h2>3. Quién recibe los datos</h2>
<ul>
<li><strong>Supabase</strong> (Supabase, Inc.): base de datos y cuentas, con servidores en la Unión Europea (Estocolmo). Encargado del tratamiento.</li>
<li><strong>Stripe</strong> (Stripe Payments Europe, Ltd., Irlanda): procesa los pagos. Stripe también trata datos como responsable para prevenir el fraude y cumplir sus obligaciones legales; consulta su política en stripe.com/privacy.</li>
<li><strong>Proveedor de alojamiento web</strong>: sirve las páginas del sitio y registra datos técnicos de las conexiones (como la dirección IP).</li>
<li><strong>Servicios de traducción y diccionario</strong>: al traducir una palabra, tu navegador la envía a Google Translate (Google LLC), MyMemory (Translated S.r.l., Italia) o Wiktionary (Wikimedia Foundation, Inc.). Reciben la palabra y tu dirección IP, pero no tu cuenta.</li>
<li><strong>Google Fonts</strong> (Google LLC): sirve las fuentes del sitio y recibe tu dirección IP.</li>
<li><strong>Apple</strong>: solo si contratas dentro de la aplicación de iOS, como responsable del cobro.</li>
<li>Autoridades públicas, cuando la ley lo exija.</li>
</ul>
<p>Algunos de estos proveedores tienen sede en Estados Unidos. Las transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en las cláusulas contractuales tipo de la Comisión Europea.</p>
<h2>4. Cuánto tiempo los conservamos</h2>
<ul>
<li>Los datos de la cuenta y tu contenido, mientras tengas la cuenta. Si la eliminas, los borramos en un plazo máximo de 30 días.</li>
<li>Los datos de pagos y facturación, el tiempo que exige la ley (hasta 6 años, según el Código de Comercio y la normativa tributaria).</li>
<li>Las estadísticas de visitas, como máximo 2 años.</li>
</ul>
<h2>5. Tus derechos</h2>
<p>Puedes pedir el acceso a tus datos, su rectificación o supresión, la limitación del tratamiento, la portabilidad y oponerte al tratamiento, escribiendo a ${MAIL}. Para eliminar tu cuenta y todos sus datos, escríbenos desde el correo de la cuenta. Responderemos en el plazo de un mes.</p>
<p>Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" rel="noreferrer">www.aepd.es</a>).</p>
<h2>6. Menores</h2>
<p>El Servicio no está dirigido a menores de 14 años y no tratamos a sabiendas sus datos.</p>
<h2>7. Seguridad</h2>
<p>Las conexiones están cifradas (HTTPS), el acceso a la base de datos está restringido a cada cuenta y los datos de pago los gestiona Stripe, certificado PCI DSS.</p>
<h2>8. Cambios</h2>
<p>Si cambiamos esta política de forma importante, te avisaremos por correo electrónico o en el Servicio.</p>`,
    refund: () => `
<h2>Cancelar la renovación</h2>
<p>Puedes cancelar cuando quieras, sin coste: en Ling, en la sección «Suscripción» de tu cuenta, o escribiendo a ${MAIL}. No se te cobrará el siguiente periodo y conservas el acceso hasta el final del periodo ya pagado.</p>
<h2>Derecho de desistimiento (14 días)</h2>
<p>Tienes derecho a desistir del contrato en un plazo de 14 días naturales desde el pago de tu primera suscripción, sin indicar el motivo. Para ejercerlo, comunícanoslo antes de que termine el plazo con una declaración clara, por ejemplo un correo a ${MAIL} desde el correo de tu cuenta. Puedes usar el formulario modelo de abajo, aunque no es obligatorio.</p>
<p>Te devolveremos el importe íntegro, sin descontar el tiempo de uso, en un plazo máximo de 14 días naturales desde que recibamos tu comunicación, con el mismo medio de pago que usaste. No tendrás ningún gasto por la devolución. El acceso de pago terminará al hacer el reembolso.</p>
<h2>Renovaciones</h2>
<p>Las renovaciones no dan lugar a un nuevo plazo de desistimiento. Aun así, si se ha cobrado una renovación y no has usado el acceso de pago desde entonces, escríbenos en los 14 días siguientes y te la devolveremos.</p>
<h2>Si el Servicio no funciona</h2>
<p>Si el Servicio no funciona como debe y no lo arreglamos en un plazo razonable, tienes derecho a una reducción del precio o a resolver el contrato con reembolso de la parte no disfrutada, según la garantía legal de conformidad.</p>
<h2>Compras en iPhone y iPad</h2>
<p>Las suscripciones contratadas dentro de la aplicación de iOS las cobra Apple: su cancelación y reembolso se solicitan a Apple en reportaproblem.apple.com.</p>
<h2>Cómo llega el reembolso</h2>
<p>El reembolso se hace a través de Stripe al mismo medio de pago. Suele verse en la cuenta en 5–10 días hábiles, según el banco.</p>
<h2>Formulario modelo de desistimiento</h2>
<blockquote>
<p>A la atención de ${SELLER.name}, ${SELLER.address}, ${EMAIL}:</p>
<p>Por la presente le comunico que desisto de mi contrato de suscripción al servicio Ling.</p>
<p>Fecha del contrato (pago): ______<br>Nombre del consumidor: ______<br>Correo electrónico de la cuenta: ______<br>Fecha: ______<br>Firma (solo si el formulario se presenta en papel)</p>
</blockquote>`,
    cookies: () => `
<p>Ling no usa cookies propias ni cookies de publicidad. Para funcionar guarda algunos datos en el almacenamiento local de tu navegador (localStorage), que la ley trata igual que las cookies (art. 22.2 de la Ley 34/2002, LSSI-CE).</p>
<h2>Almacenamiento técnico (necesario)</h2>
<p>No necesita tu consentimiento porque sin él el Servicio no funciona o no recuerda lo que has elegido:</p>
<ul>
<li>la sesión de tu cuenta, para que no tengas que iniciar sesión en cada visita;</li>
<li>el idioma de la interfaz, los ajustes y si ya has visto la introducción;</li>
<li>los libros, palabras y el progreso de lectura en el navegador, sobre todo si usas Ling sin cuenta.</li>
</ul>
<h2>Estadísticas de visitas (propias)</h2>
<p>Guardamos un identificador aleatorio (<code>ling-visitor</code>) para contar visitas y visitantes únicos. Los datos los tratamos solo nosotros, con fines estadísticos y de forma agregada; no se comparten con terceros ni se usan para publicidad. Puedes desactivarlas en este navegador:</p>
<div class="stats" data-stats></div>
<h2>Terceros</h2>
<ul>
<li>La página de pago de Stripe (checkout.stripe.com) usa sus propias cookies para procesar el pago y prevenir el fraude: consulta stripe.com/cookies-policy.</li>
<li>Google Fonts sirve las fuentes del sitio; no instala cookies, pero recibe tu dirección IP.</li>
</ul>
<h2>Cómo borrar estos datos</h2>
<p>Puedes borrar el almacenamiento local en la configuración de tu navegador (datos de sitios). Se cerrará tu sesión y se perderán los ajustes guardados en ese navegador.</p>`,
    notice: () => `
<p>En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE):</p>
<ul>
<li>Titular: ${SELLER.name}</li>
<li>NIE: ${SELLER.nie}</li>
<li>Domicilio: ${SELLER.address}</li>
<li>Correo electrónico: ${MAIL}</li>
<li>Sitio web: ${SITE}</li>
<li>Actividad: servicio en línea por suscripción para leer y aprender idiomas</li>
</ul>
<h2>Propiedad intelectual</h2>
<p>El diseño, el código, los textos y las ilustraciones de Ling pertenecen a su titular o se usan con licencia. Los libros de la biblioteca de Ling son de dominio público o se publican con permiso. No está permitido reproducirlos con fines comerciales sin autorización.</p>
<h2>Enlaces</h2>
<p>Los enlaces a sitios de terceros se ofrecen solo como información; no somos responsables de su contenido.</p>
<h2>Condiciones de uso y privacidad</h2>
<p>El uso del Servicio se rige por las <a href="terms.html">Condiciones generales de contratación</a>, la <a href="privacy.html">Política de privacidad</a> y la <a href="cookies.html">Política de cookies</a>.</p>`,
  },

  en: {
    updated: 'Updated 10 October 2026',
    nav: { terms: 'Terms', privacy: 'Privacy', refund: 'Cancellation & refunds', cookies: 'Cookies', notice: 'Legal notice' },
    titles: {
      terms: 'Terms and conditions',
      privacy: 'Privacy policy',
      refund: 'Cancellation, withdrawal and refunds',
      cookies: 'Cookie and local storage policy',
      notice: 'Legal notice',
    },
    stats: { on: 'Visit statistics are on in this browser.', off: 'Visit statistics are off in this browser.', disable: 'Turn statistics off', enable: 'Turn statistics on' },
    terms: () => `
<p>These terms govern the use of the Ling service (${SITE} and the Ling app; the “Service”) and the purchase of the paid subscription. By creating an account or subscribing you accept them. You can read, save and print them before paying. The Spanish version is the reference one.</p>
<h2>1. Who provides the Service</h2>
<p>${SELLER.name}, NIE ${SELLER.nie}, ${SELLER.address} (the “Provider”). Email: ${MAIL}.</p>
<h2>2. What Ling is</h2>
<p>2.1. Ling is an online service for reading books in foreign languages with word translations, saving and practising words and studying grammar.</p>
<p>2.2. Without a subscription you can read the first 5 pages of every book for free and use the dictionary, practice and grammar lessons. A subscription opens every book in full for the period paid for.</p>
<p>2.3. The Service is digital content and a digital service provided online. You need an account, an internet connection and an up-to-date browser or the Ling app. Paid access starts as soon as the payment is confirmed.</p>
<h2>3. Account and age</h2>
<p>3.1. You must be at least 14 to create an account. To subscribe you must be an adult or have permission from your parents or guardians.</p>
<p>3.2. You are responsible for keeping access to your account private. Accounts are personal.</p>
<h2>4. Price and payment</h2>
<p>4.1. Monthly subscription: EUR 5. Yearly subscription: EUR 39. Prices include VAT and any other applicable taxes. There are no extra charges.</p>
<p>4.2. Payment is made on Stripe’s secure payment page (Stripe Payments Europe, Ltd., Ireland) with the methods shown there (bank card and, depending on the device, Apple Pay or Google Pay). The Provider never receives or stores your card details.</p>
<p>4.3. The contract is concluded once the payment is confirmed. You will receive a payment confirmation by email; these terms are always available on this page.</p>
<h2>5. Term, renewal and cancellation</h2>
<p>5.1. The subscription renews automatically for the same period (a month or a year) until you cancel it. Each new period is charged on the day it begins.</p>
<p>5.2. You can cancel the renewal at any time, at no cost and with no penalty, in your account (Account → Subscription → Turn off auto-renewal) or by writing to ${MAIL}. You keep access until the end of the period already paid for.</p>
<p>5.3. If the price changes, we will email you at least 30 days before the renewal it applies to. If you do not agree, you can cancel before that date.</p>
<h2>6. Right of withdrawal</h2>
<p>6.1. As a consumer, you may withdraw from the contract within 14 calendar days of its conclusion (the payment for your first subscription) without giving a reason and at no cost. Even though access starts immediately, we refund the full amount.</p>
<p>6.2. How to withdraw, the refund deadline and the model form are in <a href="refund.html">Cancellation, withdrawal and refunds</a>.</p>
<h2>7. Legal guarantee of conformity</h2>
<p>7.1. The Provider is liable for the Service conforming to the contract throughout the subscription, under Spanish consumer law (Royal Legislative Decree 1/2007). If something does not work as it should, write to us: we will fix it within a reasonable time and, if that is not possible, you may ask for a price reduction or terminate the contract.</p>
<h2>8. Using the Service</h2>
<p>8.1. The Service is for personal, non-commercial use. You may not copy or redistribute books from the Ling library outside the Service, try to access other people’s accounts or systems without permission, or use the Service in a way that disrupts it.</p>
<p>8.2. Books you upload must be yours or you must have the right to use them. Only you can see them.</p>
<p>8.3. Word translations are generated automatically and may be inaccurate.</p>
<p>8.4. If you seriously breach these terms we may suspend your account after warning you, unless the law requires immediate action. If the contract ends for a reason that is not your fault, we refund the unused part of the period paid for.</p>
<h2>9. Availability and liability</h2>
<p>9.1. We work to keep the Service running without interruption, but there may be pauses for maintenance or technical failures; we will try to keep them short.</p>
<p>9.2. Nothing in these terms limits your rights under consumer protection law.</p>
<h2>10. Promo codes</h2>
<p>10.1. The Provider may grant free access with promo codes. Each code states its duration; codes cannot be exchanged for money.</p>
<h2>11. Purchases in the iPhone and iPad app</h2>
<p>11.1. If you subscribe inside the iOS app, Apple charges you under its own terms. Renewal, cancellation and refunds for such subscriptions are managed in your Apple ID settings.</p>
<h2>12. Changes to these terms</h2>
<p>12.1. We may update these terms because of legal or Service changes. We will email you about important changes at least 30 days in advance; they do not affect a period you have already paid for. If you do not agree, you can cancel your subscription.</p>
<h2>13. Customer service and complaints</h2>
<p>13.1. For any question, issue or complaint write to ${MAIL}. We will reply as soon as possible and within one month at the latest.</p>
<p>13.2. Official complaint forms (hojas de reclamaciones) are available on request at ${MAIL}. You can also contact the consumer office of your municipality or region. The Provider does not participate in any alternative dispute resolution scheme.</p>
<h2>14. Governing law and courts</h2>
<p>14.1. These terms are governed by Spanish law. As a consumer, you may bring a claim before the courts of your place of residence and keep the protection of the mandatory rules of your country of residence.</p>
<p>14.2. These terms are available in Spanish, English, Ukrainian and Russian. The Spanish version is the reference one; any doubt in interpretation will be resolved in your favour.</p>`,
    privacy: () => `
<p>This policy explains what personal data Ling (${SITE} and the Ling app) processes, why, and what rights you have, under Regulation (EU) 2016/679 (GDPR) and Spanish Organic Law 3/2018 (LOPDGDD).</p>
<h2>1. Controller</h2>
<p>${SELLER.name}, NIE ${SELLER.nie}, ${SELLER.address}. Email: ${MAIL}.</p>
<h2>2. What we process, why, and on what basis</h2>
<ul>
<li><strong>Account</strong>: your email address and sign-in data. To give you access to the Service. Basis: performance of the contract (Art. 6(1)(b) GDPR).</li>
<li><strong>Your content</strong>: books you upload, saved words, reading progress and settings. To store them and sync them across your devices. Basis: performance of the contract.</li>
<li><strong>Subscription and payments</strong>: plan, dates, status and Stripe’s customer, payment and subscription identifiers. Card details are processed by Stripe; we never receive them. To provide paid access and meet accounting and tax obligations. Basis: performance of the contract and legal obligation (Art. 6(1)(c) GDPR).</li>
<li><strong>Visit statistics</strong>: a random identifier stored in your browser, the page visited, the referring website, the device type (mobile or desktop) and, if you are signed in, your account. To understand how the Service is used and improve it. Basis: legitimate interest (Art. 6(1)(f) GDPR). You can object at any time in the <a href="cookies.html">cookie policy</a>.</li>
<li><strong>Communications</strong>: messages you send us. To reply. Basis: performance of the contract or legitimate interest.</li>
</ul>
<p>We do not sell your data, use it for advertising, make automated decisions about you or profile you.</p>
<h2>3. Who receives the data</h2>
<ul>
<li><strong>Supabase</strong> (Supabase, Inc.): database and accounts, with servers in the European Union (Stockholm). Processor.</li>
<li><strong>Stripe</strong> (Stripe Payments Europe, Ltd., Ireland): processes payments. Stripe also acts as a controller to prevent fraud and meet its legal obligations; see stripe.com/privacy.</li>
<li><strong>Web hosting provider</strong>: serves the site’s pages and logs technical connection data (such as the IP address).</li>
<li><strong>Translation and dictionary services</strong>: when you translate a word, your browser sends it to Google Translate (Google LLC), MyMemory (Translated S.r.l., Italy) or Wiktionary (Wikimedia Foundation, Inc.). They receive the word and your IP address, but not your account.</li>
<li><strong>Google Fonts</strong> (Google LLC): serves the site’s fonts and receives your IP address.</li>
<li><strong>Apple</strong>: only if you subscribe in the iOS app, as the party charging you.</li>
<li>Public authorities, where the law requires it.</li>
</ul>
<p>Some of these providers are based in the United States. Transfers rely on the EU-US Data Privacy Framework or the European Commission’s standard contractual clauses.</p>
<h2>4. How long we keep it</h2>
<ul>
<li>Account data and your content, for as long as you have the account. If you delete it, we erase them within 30 days.</li>
<li>Payment and billing data, for as long as the law requires (up to 6 years under Spanish commercial and tax law).</li>
<li>Visit statistics, for at most 2 years.</li>
</ul>
<h2>5. Your rights</h2>
<p>You can ask for access to your data, rectification, erasure, restriction, portability, and object to processing by writing to ${MAIL}. To delete your account and all its data, write to us from the account’s email address. We reply within one month.</p>
<p>If you believe we have mishandled your data, you can complain to the Spanish Data Protection Agency (<a href="https://www.aepd.es" rel="noreferrer">www.aepd.es</a>) or the authority of your country.</p>
<h2>6. Children</h2>
<p>The Service is not intended for children under 14, and we do not knowingly process their data.</p>
<h2>7. Security</h2>
<p>Connections are encrypted (HTTPS), database access is restricted to each account, and payment data is handled by Stripe, which is PCI DSS certified.</p>
<h2>8. Changes</h2>
<p>If we change this policy in an important way, we will tell you by email or in the Service.</p>`,
    refund: () => `
<h2>Cancelling the renewal</h2>
<p>You can cancel whenever you like, at no cost: in Ling, Account → Subscription → Turn off auto-renewal, or by writing to ${MAIL}. You will not be charged for the next period and you keep access until the end of the period already paid for.</p>
<h2>Right of withdrawal (14 days)</h2>
<p>You may withdraw from the contract within 14 calendar days of paying for your first subscription, without giving a reason. To do so, tell us before the deadline with a clear statement, for example an email to ${MAIL} from your account’s address. You may use the model form below, but it is not required.</p>
<p>We will refund the full amount, without deducting the time used, within 14 calendar days of receiving your notice, using the same payment method you used. You will not pay anything for the refund. Paid access ends when the refund is made.</p>
<h2>Renewals</h2>
<p>Renewals do not start a new withdrawal period. Even so, if a renewal was charged and you have not used paid access since, write to us within 14 days and we will refund it.</p>
<h2>If the Service does not work</h2>
<p>If the Service does not work as it should and we do not fix it within a reasonable time, you are entitled to a price reduction or to terminate the contract with a refund of the unused part, under the legal guarantee of conformity.</p>
<h2>Purchases on iPhone and iPad</h2>
<p>Subscriptions bought inside the iOS app are charged by Apple: request cancellation and refunds from Apple at reportaproblem.apple.com.</p>
<h2>How the refund arrives</h2>
<p>Refunds are made through Stripe to the same payment method. They usually appear within 5–10 business days, depending on the bank.</p>
<h2>Model withdrawal form</h2>
<blockquote>
<p>To ${SELLER.name}, ${SELLER.address}, ${EMAIL}:</p>
<p>I hereby give notice that I withdraw from my contract for the subscription to the Ling service.</p>
<p>Date of the contract (payment): ______<br>Name of the consumer: ______<br>Account email: ______<br>Date: ______<br>Signature (only if this form is sent on paper)</p>
</blockquote>`,
    cookies: () => `
<p>Ling uses no cookies of its own and no advertising cookies. To work, it stores some data in your browser’s local storage (localStorage), which the law treats like cookies (Art. 22(2) of Spanish Law 34/2002, LSSI-CE).</p>
<h2>Technical storage (necessary)</h2>
<p>It needs no consent, because without it the Service does not work or does not remember your choices:</p>
<ul>
<li>your account session, so you do not have to sign in on every visit;</li>
<li>the interface language, settings and whether you have seen the introduction;</li>
<li>books, words and reading progress in the browser, especially if you use Ling without an account.</li>
</ul>
<h2>Visit statistics (first-party)</h2>
<p>We store a random identifier (<code>ling-visitor</code>) to count visits and unique visitors. Only we process this data, for statistics and in aggregate; it is not shared with third parties or used for advertising. You can turn it off in this browser:</p>
<div class="stats" data-stats></div>
<h2>Third parties</h2>
<ul>
<li>Stripe’s payment page (checkout.stripe.com) uses its own cookies to process the payment and prevent fraud: see stripe.com/cookies-policy.</li>
<li>Google Fonts serves the site’s fonts; it sets no cookies but receives your IP address.</li>
</ul>
<h2>How to delete this data</h2>
<p>You can clear local storage in your browser settings (site data). This signs you out and removes settings saved in that browser.</p>`,
    notice: () => `
<p>Information under Article 10 of Spanish Law 34/2002 on information society services and electronic commerce (LSSI-CE):</p>
<ul>
<li>Owner: ${SELLER.name}</li>
<li>NIE: ${SELLER.nie}</li>
<li>Address: ${SELLER.address}</li>
<li>Email: ${MAIL}</li>
<li>Website: ${SITE}</li>
<li>Activity: online subscription service for reading and learning languages</li>
</ul>
<h2>Intellectual property</h2>
<p>Ling’s design, code, texts and illustrations belong to its owner or are used under licence. Books in the Ling library are in the public domain or published with permission. They may not be reproduced for commercial purposes without permission.</p>
<h2>Links</h2>
<p>Links to third-party sites are provided for information only; we are not responsible for their content.</p>
<h2>Terms and privacy</h2>
<p>Use of the Service is governed by the <a href="terms.html">Terms and conditions</a>, the <a href="privacy.html">Privacy policy</a> and the <a href="cookies.html">Cookie policy</a>.</p>`,
  },

  uk: {
    updated: 'Оновлено 10 жовтня 2026 р.',
    nav: { terms: 'Умови', privacy: 'Конфіденційність', refund: 'Скасування й повернення', cookies: 'Cookies', notice: 'Юридична інформація' },
    titles: {
      terms: 'Загальні умови договору',
      privacy: 'Політика конфіденційності',
      refund: 'Скасування, відмова від договору й повернення коштів',
      cookies: 'Політика щодо cookies і локального сховища',
      notice: 'Юридична інформація',
    },
    stats: { on: 'Статистику відвідувань у цьому браузері ввімкнено.', off: 'Статистику відвідувань у цьому браузері вимкнено.', disable: 'Вимкнути статистику', enable: 'Увімкнути статистику' },
    terms: () => `
<p>Ці умови регулюють користування сервісом Ling (${SITE} і застосунок Ling; далі — «Сервіс») і придбання платної підписки. Створюючи акаунт або оформлюючи підписку, ти їх приймаєш. До оплати їх можна прочитати, зберегти й роздрукувати. Основною є іспанська версія.</p>
<h2>1. Хто надає Сервіс</h2>
<p>${SELLER.name}, NIE ${SELLER.nie}, адреса: ${SELLER.address} (далі — «Виконавець»). Ел. пошта: ${MAIL}.</p>
<h2>2. Що таке Ling</h2>
<p>2.1. Ling — онлайн-сервіс для читання книжок іноземними мовами з перекладом слів, збереження й повторення слів і вивчення граматики.</p>
<p>2.2. Без підписки можна безкоштовно читати перші 5 сторінок кожної книжки й користуватися словником, тренуваннями та уроками граматики. Підписка відкриває всі книжки повністю на оплачений період.</p>
<p>2.3. Сервіс — це цифровий контент і цифрова послуга онлайн. Потрібні акаунт, інтернет і сучасний браузер або застосунок Ling. Платний доступ відкривається одразу після підтвердження оплати.</p>
<h2>3. Акаунт і вік</h2>
<p>3.1. Створити акаунт можна з 14 років. Оформити підписку може повнолітня особа або неповнолітня з дозволу батьків чи опікунів.</p>
<p>3.2. Ти відповідаєш за те, щоб доступ до акаунта не потрапив до інших. Акаунт особистий.</p>
<h2>4. Ціна й оплата</h2>
<p>4.1. Підписка на місяць — 5 €, на рік — 39 €. Ціни включають ПДВ (IVA) та інші податки. Додаткових платежів немає.</p>
<p>4.2. Оплата відбувається на захищеній сторінці Stripe (Stripe Payments Europe, Ltd., Ірландія) способами, показаними там (банківська картка, а залежно від пристрою — Apple Pay або Google Pay). Виконавець не отримує й не зберігає дані карток.</p>
<p>4.3. Договір укладено з моменту підтвердження оплати. Підтвердження надійде ел. поштою; ці умови завжди доступні на цій сторінці.</p>
<h2>5. Строк, подовження й скасування</h2>
<p>5.1. Підписка подовжується автоматично на такий самий період (місяць або рік), доки ти її не скасуєш. Оплата за новий період списується в день його початку.</p>
<p>5.2. Скасувати автоподовження можна будь-коли, без оплати й штрафів: в акаунті (Акаунт → Підписка → Скасувати автоподовження) або листом на ${MAIL}. Доступ зберігається до кінця вже оплаченого періоду.</p>
<p>5.3. Якщо ціна зміниться, ми повідомимо ел. поштою щонайменше за 30 днів до подовження, з якого вона діятиме. Якщо ти не згоден, можна скасувати підписку до цієї дати.</p>
<h2>6. Право відмовитися від договору</h2>
<p>6.1. Як споживач ти можеш відмовитися від договору протягом 14 календарних днів з моменту його укладення (оплати першої підписки) без пояснення причин і без жодних витрат. Хоча доступ відкривається одразу, ми повертаємо всю суму.</p>
<p>6.2. Як це зробити, строк повернення й типова форма — у розділі <a href="refund.html">Скасування й повернення</a>.</p>
<h2>7. Гарантія відповідності</h2>
<p>7.1. Виконавець відповідає за те, щоб Сервіс відповідав договору протягом усієї підписки, згідно з іспанським законодавством про захист прав споживачів (Real Decreto Legislativo 1/2007). Якщо щось працює не так, напиши нам: ми виправимо це в розумний строк, а якщо це неможливо, ти можеш вимагати зниження ціни або розірвати договір.</p>
<h2>8. Користування Сервісом</h2>
<p>8.1. Сервіс призначено для особистого некомерційного використання. Заборонено копіювати чи поширювати книжки з бібліотеки Ling поза Сервісом, намагатися отримати доступ до чужих акаунтів або систем, а також заважати роботі Сервісу.</p>
<p>8.2. Книжки, які ти завантажуєш, мають належати тобі або ти маєш мати право ними користуватися. Бачиш їх лише ти.</p>
<p>8.3. Переклади слів формуються автоматично й можуть бути неточними.</p>
<p>8.4. У разі серйозного порушення цих умов ми можемо призупинити акаунт, попередивши тебе, якщо закон не вимагає діяти негайно. Якщо договір припиняється не з твоєї вини, ми повертаємо невикористану частину оплаченого періоду.</p>
<h2>9. Доступність і відповідальність</h2>
<p>9.1. Ми дбаємо про безперебійну роботу Сервісу, але можливі перерви на обслуговування чи через технічні збої; ми намагатимемося, щоб вони були короткими.</p>
<p>9.2. Ніщо в цих умовах не обмежує прав, які тобі надає законодавство про захист прав споживачів.</p>
<h2>10. Промокоди</h2>
<p>10.1. Виконавець може надавати безкоштовний доступ за промокодами. У кожного коду вказано строк дії; обміняти його на гроші не можна.</p>
<h2>11. Покупки в застосунку для iPhone та iPad</h2>
<p>11.1. Якщо підписку оформлено в застосунку iOS, оплату стягує Apple за своїми умовами. Подовження, скасування й повернення таких підписок керуються в налаштуваннях Apple ID.</p>
<h2>12. Зміни умов</h2>
<p>12.1. Ми можемо оновлювати ці умови через зміни законодавства чи Сервісу. Про важливі зміни повідомимо ел. поштою щонайменше за 30 днів; вони не стосуються вже оплаченого періоду. Якщо ти не згоден, можна скасувати підписку.</p>
<h2>13. Підтримка й скарги</h2>
<p>13.1. З будь-якими питаннями чи скаргами пиши на ${MAIL}. Ми відповімо якнайшвидше, але не пізніше ніж за місяць.</p>
<p>13.2. Офіційні бланки скарг (hojas de reclamaciones) надаються на запит на ${MAIL}. Також можна звернутися до служби захисту прав споживачів за місцем проживання. Виконавець не бере участі в жодній системі альтернативного вирішення спорів.</p>
<h2>14. Право й суди</h2>
<p>14.1. Ці умови регулюються правом Іспанії. Як споживач ти можеш звернутися до суду за місцем свого проживання й зберігаєш захист імперативних норм країни свого проживання.</p>
<p>14.2. Умови доступні іспанською, англійською, українською й російською. Основною є іспанська версія; будь-які сумніви в тлумаченні вирішуються на твою користь.</p>`,
    privacy: () => `
<p>Ця політика пояснює, які персональні дані обробляє Ling (${SITE} і застосунок Ling), навіщо і які права ти маєш, згідно з Регламентом (ЄС) 2016/679 (GDPR) та іспанським Органічним законом 3/2018 (LOPDGDD).</p>
<h2>1. Контролер даних</h2>
<p>${SELLER.name}, NIE ${SELLER.nie}, ${SELLER.address}. Ел. пошта: ${MAIL}.</p>
<h2>2. Які дані, навіщо й на якій підставі</h2>
<ul>
<li><strong>Акаунт</strong>: адреса ел. пошти й дані для входу. Щоб надати доступ до Сервісу. Підстава: виконання договору (ст. 6(1)(b) GDPR).</li>
<li><strong>Твій контент</strong>: завантажені книжки, збережені слова, прогрес читання й налаштування. Щоб зберігати їх і синхронізувати між пристроями. Підстава: виконання договору.</li>
<li><strong>Підписка й оплати</strong>: план, дати, статус та ідентифікатори клієнта, платежу й підписки в Stripe. Дані карток обробляє Stripe, ми їх не отримуємо. Щоб надати платний доступ і виконати бухгалтерські й податкові обов’язки. Підстава: виконання договору й юридичний обов’язок (ст. 6(1)(c) GDPR).</li>
<li><strong>Статистика відвідувань</strong>: випадковий ідентифікатор у браузері, відвідана сторінка, сайт, з якого ти прийшов, тип пристрою (мобільний чи комп’ютер) і, якщо ти ввійшов, твій акаунт. Щоб розуміти, як користуються Сервісом, і покращувати його. Підстава: законний інтерес (ст. 6(1)(f) GDPR). Заперечити можна будь-коли в <a href="cookies.html">політиці щодо cookies</a>.</li>
<li><strong>Листування</strong>: повідомлення, які ти нам надсилаєш. Щоб відповісти. Підстава: виконання договору або законний інтерес.</li>
</ul>
<p>Ми не продаємо дані, не використовуємо їх для реклами, не ухвалюємо автоматизованих рішень і не складаємо профілів.</p>
<h2>3. Хто отримує дані</h2>
<ul>
<li><strong>Supabase</strong> (Supabase, Inc.): база даних і акаунти, сервери в Європейському Союзі (Стокгольм). Обробник.</li>
<li><strong>Stripe</strong> (Stripe Payments Europe, Ltd., Ірландія): обробляє платежі. Stripe також є контролером для запобігання шахрайству й виконання своїх юридичних обов’язків; див. stripe.com/privacy.</li>
<li><strong>Хостинг-провайдер</strong>: віддає сторінки сайту й записує технічні дані з’єднань (як-от IP-адресу).</li>
<li><strong>Сервіси перекладу й словники</strong>: коли ти перекладаєш слово, браузер надсилає його до Google Translate (Google LLC), MyMemory (Translated S.r.l., Італія) або Wiktionary (Wikimedia Foundation, Inc.). Вони отримують слово й IP-адресу, але не акаунт.</li>
<li><strong>Google Fonts</strong> (Google LLC): віддає шрифти сайту й отримує IP-адресу.</li>
<li><strong>Apple</strong>: лише якщо підписку оформлено в застосунку iOS, як сторона, що стягує оплату.</li>
<li>Державні органи, коли цього вимагає закон.</li>
</ul>
<p>Деякі з цих постачальників розташовані в США. Передавання даних відбувається на підставі Рамкової угоди ЄС–США про конфіденційність даних або стандартних договірних положень Європейської комісії.</p>
<h2>4. Скільки зберігаємо</h2>
<ul>
<li>Дані акаунта й контент — доки існує акаунт. Після видалення акаунта ми стираємо їх протягом 30 днів.</li>
<li>Дані про оплати й рахунки — стільки, скільки вимагає закон (до 6 років за іспанським комерційним і податковим правом).</li>
<li>Статистику відвідувань — не довше 2 років.</li>
</ul>
<h2>5. Твої права</h2>
<p>Ти можеш вимагати доступу до своїх даних, їх виправлення, видалення, обмеження обробки, перенесення, а також заперечити проти обробки, написавши на ${MAIL}. Щоб видалити акаунт і всі дані, напиши нам з адреси акаунта. Ми відповідаємо протягом місяця.</p>
<p>Якщо вважаєш, що ми неправильно обробляємо твої дані, можна поскаржитися до Іспанського агентства із захисту даних (<a href="https://www.aepd.es" rel="noreferrer">www.aepd.es</a>) або до органу своєї країни.</p>
<h2>6. Діти</h2>
<p>Сервіс не призначений для дітей до 14 років, і ми свідомо не обробляємо їхніх даних.</p>
<h2>7. Безпека</h2>
<p>З’єднання зашифровані (HTTPS), доступ до бази даних обмежено кожним акаунтом, платіжні дані обробляє Stripe із сертифікацією PCI DSS.</p>
<h2>8. Зміни</h2>
<p>Про суттєві зміни цієї політики ми повідомимо ел. поштою або в Сервісі.</p>`,
    refund: () => `
<h2>Скасування автоподовження</h2>
<p>Скасувати можна будь-коли й безкоштовно: у Ling, Акаунт → Підписка → Скасувати автоподовження, або листом на ${MAIL}. Наступний період не буде списано, а доступ збережеться до кінця вже оплаченого періоду.</p>
<h2>Право відмовитися від договору (14 днів)</h2>
<p>Ти можеш відмовитися від договору протягом 14 календарних днів після оплати першої підписки без пояснення причин. Для цього повідом нам до кінця строку чітку заяву, наприклад листом на ${MAIL} з адреси акаунта. Можна скористатися типовою формою нижче, але це не обов’язково.</p>
<p>Ми повернемо всю суму, не віднімаючи часу користування, не пізніше ніж за 14 календарних днів після отримання заяви, тим самим способом оплати. Жодних витрат на повернення ти не несеш. Платний доступ припиняється з поверненням коштів.</p>
<h2>Подовження</h2>
<p>Подовження не відкриває нового строку для відмови. Проте якщо подовження списано, а ти відтоді не користувався платним доступом, напиши нам протягом 14 днів — ми повернемо кошти.</p>
<h2>Якщо Сервіс не працює</h2>
<p>Якщо Сервіс працює не так, як має, і ми не виправили це в розумний строк, ти маєш право на зниження ціни або на розірвання договору з поверненням невикористаної частини згідно з гарантією відповідності.</p>
<h2>Покупки на iPhone та iPad</h2>
<p>Підписки, оформлені в застосунку iOS, оплачуються через Apple: скасування й повернення запитуються в Apple на reportaproblem.apple.com.</p>
<h2>Як надходять кошти</h2>
<p>Повернення відбувається через Stripe на той самий спосіб оплати. Зазвичай гроші надходять протягом 5–10 робочих днів, залежно від банку.</p>
<h2>Типова форма відмови від договору</h2>
<blockquote>
<p>Кому: ${SELLER.name}, ${SELLER.address}, ${EMAIL}</p>
<p>Цим повідомляю, що відмовляюся від договору про підписку на сервіс Ling.</p>
<p>Дата договору (оплати): ______<br>Ім’я споживача: ______<br>Ел. пошта акаунта: ______<br>Дата: ______<br>Підпис (лише для паперової форми)</p>
</blockquote>`,
    cookies: () => `
<p>Ling не використовує власних і рекламних cookies. Для роботи він зберігає деякі дані в локальному сховищі браузера (localStorage), яке закон прирівнює до cookies (ст. 22.2 іспанського Закону 34/2002, LSSI-CE).</p>
<h2>Технічне сховище (необхідне)</h2>
<p>Згода не потрібна, бо без нього Сервіс не працює або не пам’ятає твого вибору:</p>
<ul>
<li>сесія акаунта, щоб не входити щоразу;</li>
<li>мова інтерфейсу, налаштування й те, чи ти вже бачив вступ;</li>
<li>книжки, слова й прогрес читання в браузері, особливо якщо ти користуєшся Ling без акаунта.</li>
</ul>
<h2>Статистика відвідувань (власна)</h2>
<p>Ми зберігаємо випадковий ідентифікатор (<code>ling-visitor</code>), щоб рахувати відвідування й унікальних відвідувачів. Ці дані обробляємо лише ми, для статистики й у зведеному вигляді; вони не передаються третім особам і не використовуються для реклами. Вимкнути статистику в цьому браузері:</p>
<div class="stats" data-stats></div>
<h2>Треті сторони</h2>
<ul>
<li>Сторінка оплати Stripe (checkout.stripe.com) використовує власні cookies для обробки платежу й захисту від шахрайства: див. stripe.com/cookies-policy.</li>
<li>Google Fonts віддає шрифти сайту; cookies не встановлює, але отримує IP-адресу.</li>
</ul>
<h2>Як видалити ці дані</h2>
<p>Локальне сховище можна очистити в налаштуваннях браузера (дані сайтів). Після цього сесія завершиться, а збережені в цьому браузері налаштування зникнуть.</p>`,
    notice: () => `
<p>Інформація відповідно до ст. 10 іспанського Закону 34/2002 про послуги інформаційного суспільства й електронну комерцію (LSSI-CE):</p>
<ul>
<li>Власник: ${SELLER.name}</li>
<li>NIE: ${SELLER.nie}</li>
<li>Адреса: ${SELLER.address}</li>
<li>Ел. пошта: ${MAIL}</li>
<li>Сайт: ${SITE}</li>
<li>Діяльність: онлайн-сервіс за підпискою для читання й вивчення мов</li>
</ul>
<h2>Інтелектуальна власність</h2>
<p>Дизайн, код, тексти й ілюстрації Ling належать власникові або використовуються за ліцензією. Книжки бібліотеки Ling перебувають у суспільному надбанні або опубліковані з дозволу. Відтворювати їх з комерційною метою без дозволу заборонено.</p>
<h2>Посилання</h2>
<p>Посилання на сторонні сайти наведено лише для інформації; ми не відповідаємо за їхній зміст.</p>
<h2>Умови й конфіденційність</h2>
<p>Користування Сервісом регулюють <a href="terms.html">Загальні умови договору</a>, <a href="privacy.html">Політика конфіденційності</a> та <a href="cookies.html">Політика щодо cookies</a>.</p>`,
  },

  ru: {
    updated: 'Обновлено 10 октября 2026 г.',
    nav: { terms: 'Условия', privacy: 'Конфиденциальность', refund: 'Отмена и возврат', cookies: 'Cookies', notice: 'Юридическая информация' },
    titles: {
      terms: 'Общие условия договора',
      privacy: 'Политика конфиденциальности',
      refund: 'Отмена, отказ от договора и возврат средств',
      cookies: 'Политика в отношении cookies и локального хранилища',
      notice: 'Юридическая информация',
    },
    stats: { on: 'Статистика посещений в этом браузере включена.', off: 'Статистика посещений в этом браузере выключена.', disable: 'Выключить статистику', enable: 'Включить статистику' },
    terms: () => `
<p>Эти условия регулируют пользование сервисом Ling (${SITE} и приложение Ling; далее — «Сервис») и покупку платной подписки. Создавая аккаунт или оформляя подписку, ты их принимаешь. До оплаты их можно прочитать, сохранить и распечатать. Основной является испанская версия.</p>
<h2>1. Кто предоставляет Сервис</h2>
<p>${SELLER.name}, NIE ${SELLER.nie}, адрес: ${SELLER.address} (далее — «Исполнитель»). Эл. почта: ${MAIL}.</p>
<h2>2. Что такое Ling</h2>
<p>2.1. Ling — онлайн-сервис для чтения книг на иностранных языках с переводом слов, сохранения и повторения слов и изучения грамматики.</p>
<p>2.2. Без подписки можно бесплатно читать первые 5 страниц каждой книги и пользоваться словарём, тренировками и уроками грамматики. Подписка открывает все книги полностью на оплаченный период.</p>
<p>2.3. Сервис — это цифровой контент и цифровая услуга онлайн. Нужны аккаунт, интернет и современный браузер или приложение Ling. Платный доступ открывается сразу после подтверждения оплаты.</p>
<h2>3. Аккаунт и возраст</h2>
<p>3.1. Создать аккаунт можно с 14 лет. Оформить подписку может совершеннолетний или несовершеннолетний с разрешения родителей или опекунов.</p>
<p>3.2. Ты отвечаешь за то, чтобы доступ к аккаунту не попал к другим. Аккаунт личный.</p>
<h2>4. Цена и оплата</h2>
<p>4.1. Подписка на месяц — 5 €, на год — 39 €. Цены включают НДС (IVA) и другие налоги. Дополнительных платежей нет.</p>
<p>4.2. Оплата проходит на защищённой странице Stripe (Stripe Payments Europe, Ltd., Ирландия) способами, показанными там (банковская карта, а в зависимости от устройства — Apple Pay или Google Pay). Исполнитель не получает и не хранит данные карт.</p>
<p>4.3. Договор заключён с момента подтверждения оплаты. Подтверждение придёт по эл. почте; эти условия всегда доступны на этой странице.</p>
<h2>5. Срок, продление и отмена</h2>
<p>5.1. Подписка продлевается автоматически на такой же период (месяц или год), пока ты её не отменишь. Оплата за новый период списывается в день его начала.</p>
<p>5.2. Отменить автопродление можно в любой момент, бесплатно и без штрафов: в аккаунте (Аккаунт → Подписка → Отменить автопродление) или письмом на ${MAIL}. Доступ сохраняется до конца уже оплаченного периода.</p>
<p>5.3. Если цена изменится, мы сообщим по эл. почте не позднее чем за 30 дней до продления, с которого она будет действовать. Если ты не согласен, можно отменить подписку до этой даты.</p>
<h2>6. Право отказаться от договора</h2>
<p>6.1. Как потребитель ты можешь отказаться от договора в течение 14 календарных дней с момента его заключения (оплаты первой подписки) без объяснения причин и без каких-либо расходов. Хотя доступ открывается сразу, мы возвращаем всю сумму.</p>
<p>6.2. Как это сделать, срок возврата и типовая форма — в разделе <a href="refund.html">Отмена и возврат</a>.</p>
<h2>7. Гарантия соответствия</h2>
<p>7.1. Исполнитель отвечает за то, чтобы Сервис соответствовал договору в течение всей подписки, согласно испанскому законодательству о защите прав потребителей (Real Decreto Legislativo 1/2007). Если что-то работает не так, напиши нам: мы исправим это в разумный срок, а если это невозможно, ты вправе потребовать снижения цены или расторгнуть договор.</p>
<h2>8. Пользование Сервисом</h2>
<p>8.1. Сервис предназначен для личного некоммерческого использования. Запрещено копировать или распространять книги из библиотеки Ling вне Сервиса, пытаться получить доступ к чужим аккаунтам или системам, а также мешать работе Сервиса.</p>
<p>8.2. Книги, которые ты загружаешь, должны принадлежать тебе или ты должен иметь право ими пользоваться. Видишь их только ты.</p>
<p>8.3. Переводы слов формируются автоматически и могут быть неточными.</p>
<p>8.4. При серьёзном нарушении этих условий мы можем приостановить аккаунт, предупредив тебя, если закон не требует действовать немедленно. Если договор прекращается не по твоей вине, мы возвращаем неиспользованную часть оплаченного периода.</p>
<h2>9. Доступность и ответственность</h2>
<p>9.1. Мы стараемся, чтобы Сервис работал без перебоев, но возможны перерывы на обслуживание или из-за технических сбоев; мы постараемся, чтобы они были короткими.</p>
<p>9.2. Ничто в этих условиях не ограничивает прав, которые тебе даёт законодательство о защите прав потребителей.</p>
<h2>10. Промокоды</h2>
<p>10.1. Исполнитель может давать бесплатный доступ по промокодам. У каждого кода указан срок действия; обменять его на деньги нельзя.</p>
<h2>11. Покупки в приложении для iPhone и iPad</h2>
<p>11.1. Если подписка оформлена в приложении iOS, оплату взимает Apple по своим условиям. Продление, отмена и возврат таких подписок управляются в настройках Apple ID.</p>
<h2>12. Изменение условий</h2>
<p>12.1. Мы можем обновлять эти условия из-за изменений законодательства или Сервиса. О важных изменениях сообщим по эл. почте не позднее чем за 30 дней; они не касаются уже оплаченного периода. Если ты не согласен, можно отменить подписку.</p>
<h2>13. Поддержка и жалобы</h2>
<p>13.1. С любыми вопросами и жалобами пиши на ${MAIL}. Мы ответим как можно скорее, но не позднее чем через месяц.</p>
<p>13.2. Официальные бланки жалоб (hojas de reclamaciones) предоставляются по запросу на ${MAIL}. Также можно обратиться в службу защиты прав потребителей по месту жительства. Исполнитель не участвует ни в какой системе альтернативного разрешения споров.</p>
<h2>14. Право и суды</h2>
<p>14.1. Эти условия регулируются правом Испании. Как потребитель ты можешь обратиться в суд по месту своего жительства и сохраняешь защиту императивных норм страны своего проживания.</p>
<p>14.2. Условия доступны на испанском, английском, украинском и русском. Основной является испанская версия; любые сомнения в толковании разрешаются в твою пользу.</p>`,
    privacy: () => `
<p>Эта политика объясняет, какие персональные данные обрабатывает Ling (${SITE} и приложение Ling), зачем и какие у тебя права, согласно Регламенту (ЕС) 2016/679 (GDPR) и испанскому Органическому закону 3/2018 (LOPDGDD).</p>
<h2>1. Контролёр данных</h2>
<p>${SELLER.name}, NIE ${SELLER.nie}, ${SELLER.address}. Эл. почта: ${MAIL}.</p>
<h2>2. Какие данные, зачем и на каком основании</h2>
<ul>
<li><strong>Аккаунт</strong>: адрес эл. почты и данные для входа. Чтобы дать доступ к Сервису. Основание: исполнение договора (ст. 6(1)(b) GDPR).</li>
<li><strong>Твой контент</strong>: загруженные книги, сохранённые слова, прогресс чтения и настройки. Чтобы хранить их и синхронизировать между устройствами. Основание: исполнение договора.</li>
<li><strong>Подписка и оплаты</strong>: план, даты, статус и идентификаторы клиента, платежа и подписки в Stripe. Данные карт обрабатывает Stripe, мы их не получаем. Чтобы дать платный доступ и выполнить бухгалтерские и налоговые обязанности. Основание: исполнение договора и юридическая обязанность (ст. 6(1)(c) GDPR).</li>
<li><strong>Статистика посещений</strong>: случайный идентификатор в браузере, посещённая страница, сайт, с которого ты пришёл, тип устройства (мобильное или компьютер) и, если ты вошёл, твой аккаунт. Чтобы понимать, как пользуются Сервисом, и улучшать его. Основание: законный интерес (ст. 6(1)(f) GDPR). Возразить можно в любой момент в <a href="cookies.html">политике cookies</a>.</li>
<li><strong>Переписка</strong>: сообщения, которые ты нам отправляешь. Чтобы ответить. Основание: исполнение договора или законный интерес.</li>
</ul>
<p>Мы не продаём данные, не используем их для рекламы, не принимаем автоматизированных решений и не составляем профилей.</p>
<h2>3. Кто получает данные</h2>
<ul>
<li><strong>Supabase</strong> (Supabase, Inc.): база данных и аккаунты, серверы в Европейском союзе (Стокгольм). Обработчик.</li>
<li><strong>Stripe</strong> (Stripe Payments Europe, Ltd., Ирландия): обрабатывает платежи. Stripe также выступает контролёром для предотвращения мошенничества и выполнения своих юридических обязанностей; см. stripe.com/privacy.</li>
<li><strong>Хостинг-провайдер</strong>: отдаёт страницы сайта и записывает технические данные соединений (например, IP-адрес).</li>
<li><strong>Сервисы перевода и словари</strong>: когда ты переводишь слово, браузер отправляет его в Google Translate (Google LLC), MyMemory (Translated S.r.l., Италия) или Wiktionary (Wikimedia Foundation, Inc.). Они получают слово и IP-адрес, но не аккаунт.</li>
<li><strong>Google Fonts</strong> (Google LLC): отдаёт шрифты сайта и получает IP-адрес.</li>
<li><strong>Apple</strong>: только если подписка оформлена в приложении iOS, как сторона, взимающая оплату.</li>
<li>Государственные органы, когда этого требует закон.</li>
</ul>
<p>Некоторые из этих поставщиков находятся в США. Передача данных происходит на основании Рамочного соглашения ЕС–США о конфиденциальности данных или стандартных договорных условий Европейской комиссии.</p>
<h2>4. Сколько храним</h2>
<ul>
<li>Данные аккаунта и контент — пока существует аккаунт. После удаления аккаунта мы стираем их в течение 30 дней.</li>
<li>Данные об оплатах и счетах — столько, сколько требует закон (до 6 лет по испанскому коммерческому и налоговому праву).</li>
<li>Статистику посещений — не дольше 2 лет.</li>
</ul>
<h2>5. Твои права</h2>
<p>Ты можешь запросить доступ к своим данным, их исправление, удаление, ограничение обработки, перенос, а также возразить против обработки, написав на ${MAIL}. Чтобы удалить аккаунт и все данные, напиши нам с адреса аккаунта. Мы отвечаем в течение месяца.</p>
<p>Если считаешь, что мы неправильно обрабатываем твои данные, можно пожаловаться в Испанское агентство по защите данных (<a href="https://www.aepd.es" rel="noreferrer">www.aepd.es</a>) или в орган своей страны.</p>
<h2>6. Дети</h2>
<p>Сервис не предназначен для детей до 14 лет, и мы сознательно не обрабатываем их данные.</p>
<h2>7. Безопасность</h2>
<p>Соединения зашифрованы (HTTPS), доступ к базе данных ограничен каждым аккаунтом, платёжные данные обрабатывает Stripe с сертификацией PCI DSS.</p>
<h2>8. Изменения</h2>
<p>О существенных изменениях этой политики мы сообщим по эл. почте или в Сервисе.</p>`,
    refund: () => `
<h2>Отмена автопродления</h2>
<p>Отменить можно в любой момент и бесплатно: в Ling, Аккаунт → Подписка → Отменить автопродление, или письмом на ${MAIL}. Следующий период не будет списан, а доступ сохранится до конца уже оплаченного периода.</p>
<h2>Право отказаться от договора (14 дней)</h2>
<p>Ты можешь отказаться от договора в течение 14 календарных дней после оплаты первой подписки без объяснения причин. Для этого до конца срока сообщи нам ясное заявление, например письмом на ${MAIL} с адреса аккаунта. Можно воспользоваться типовой формой ниже, но это не обязательно.</p>
<p>Мы вернём всю сумму, не вычитая время пользования, не позднее чем через 14 календарных дней после получения заявления, тем же способом оплаты. Никаких расходов на возврат ты не несёшь. Платный доступ прекращается с возвратом средств.</p>
<h2>Продления</h2>
<p>Продление не открывает нового срока для отказа. Тем не менее, если продление списано, а ты с тех пор не пользовался платным доступом, напиши нам в течение 14 дней — мы вернём деньги.</p>
<h2>Если Сервис не работает</h2>
<p>Если Сервис работает не так, как должен, и мы не исправили это в разумный срок, ты вправе получить снижение цены или расторгнуть договор с возвратом неиспользованной части согласно гарантии соответствия.</p>
<h2>Покупки на iPhone и iPad</h2>
<p>Подписки, оформленные в приложении iOS, оплачиваются через Apple: отмену и возврат нужно запрашивать у Apple на reportaproblem.apple.com.</p>
<h2>Как приходят деньги</h2>
<p>Возврат проходит через Stripe на тот же способ оплаты. Обычно деньги приходят в течение 5–10 рабочих дней, в зависимости от банка.</p>
<h2>Типовая форма отказа от договора</h2>
<blockquote>
<p>Кому: ${SELLER.name}, ${SELLER.address}, ${EMAIL}</p>
<p>Настоящим сообщаю, что отказываюсь от договора о подписке на сервис Ling.</p>
<p>Дата договора (оплаты): ______<br>Имя потребителя: ______<br>Эл. почта аккаунта: ______<br>Дата: ______<br>Подпись (только для бумажной формы)</p>
</blockquote>`,
    cookies: () => `
<p>Ling не использует собственных и рекламных cookies. Для работы он хранит некоторые данные в локальном хранилище браузера (localStorage), которое закон приравнивает к cookies (ст. 22.2 испанского Закона 34/2002, LSSI-CE).</p>
<h2>Техническое хранилище (необходимое)</h2>
<p>Согласие не нужно, потому что без него Сервис не работает или не помнит твой выбор:</p>
<ul>
<li>сессия аккаунта, чтобы не входить каждый раз;</li>
<li>язык интерфейса, настройки и то, видел ли ты уже вступление;</li>
<li>книги, слова и прогресс чтения в браузере, особенно если ты пользуешься Ling без аккаунта.</li>
</ul>
<h2>Статистика посещений (собственная)</h2>
<p>Мы храним случайный идентификатор (<code>ling-visitor</code>), чтобы считать посещения и уникальных посетителей. Эти данные обрабатываем только мы, для статистики и в сводном виде; они не передаются третьим лицам и не используются для рекламы. Выключить статистику в этом браузере:</p>
<div class="stats" data-stats></div>
<h2>Третьи стороны</h2>
<ul>
<li>Страница оплаты Stripe (checkout.stripe.com) использует собственные cookies для обработки платежа и защиты от мошенничества: см. stripe.com/cookies-policy.</li>
<li>Google Fonts отдаёт шрифты сайта; cookies не устанавливает, но получает IP-адрес.</li>
</ul>
<h2>Как удалить эти данные</h2>
<p>Локальное хранилище можно очистить в настройках браузера (данные сайтов). После этого сессия завершится, а сохранённые в этом браузере настройки пропадут.</p>`,
    notice: () => `
<p>Информация согласно ст. 10 испанского Закона 34/2002 об услугах информационного общества и электронной коммерции (LSSI-CE):</p>
<ul>
<li>Владелец: ${SELLER.name}</li>
<li>NIE: ${SELLER.nie}</li>
<li>Адрес: ${SELLER.address}</li>
<li>Эл. почта: ${MAIL}</li>
<li>Сайт: ${SITE}</li>
<li>Деятельность: онлайн-сервис по подписке для чтения и изучения языков</li>
</ul>
<h2>Интеллектуальная собственность</h2>
<p>Дизайн, код, тексты и иллюстрации Ling принадлежат владельцу или используются по лицензии. Книги библиотеки Ling находятся в общественном достоянии или опубликованы с разрешения. Воспроизводить их в коммерческих целях без разрешения запрещено.</p>
<h2>Ссылки</h2>
<p>Ссылки на сторонние сайты приведены только для информации; мы не отвечаем за их содержание.</p>
<h2>Условия и конфиденциальность</h2>
<p>Пользование Сервисом регулируют <a href="terms.html">Общие условия договора</a>, <a href="privacy.html">Политика конфиденциальности</a> и <a href="cookies.html">Политика cookies</a>.</p>`,
  },
}

const LANGUAGE_NAMES = { es: 'Español', en: 'English', uk: 'Українська', ru: 'Русский' }

/** The cookie page's switch for the visit statistics, filled in by a small inline script. */
const statsScript = (stats) => `<script>(function(){var box=document.querySelector('[data-stats]');if(!box)return;var key=${JSON.stringify(NO_STATS_KEY)},t=${JSON.stringify(stats)};function off(){try{return localStorage.getItem(key)==='1'}catch(e){return false}}function render(){var o=off();box.innerHTML='';var p=document.createElement('p');p.textContent=o?t.off:t.on;var b=document.createElement('button');b.type='button';b.textContent=o?t.enable:t.disable;b.onclick=function(){try{if(off())localStorage.removeItem(key);else{localStorage.setItem(key,'1');localStorage.removeItem('ling-visitor')}}catch(e){}render()};box.appendChild(p);box.appendChild(b)}render()})()</script>`

const page = (lang, key) => {
  const t = TEXT[lang]
  const links = PAGES.map((k) => (k === key ? `<strong>${t.nav[k]}</strong>` : `<a href="${k}.html">${t.nav[k]}</a>`)).join(' · ')
  const languages = LANGUAGES.filter((other) => other !== lang)
    .map((other) => `<a href="../${other}/${key}.html" lang="${other}">${LANGUAGE_NAMES[other]}</a>`).join(' · ')
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t.titles[key]} — Ling</title>
<style>
:root { color-scheme: light dark; --ink: #20352f; --muted: #667770; --line: #e3eae5; --bg: #fbfcfa; --accent: #315b4d; --soft: #f0f4f1; }
@media (prefers-color-scheme: dark) { :root { --ink: #e4ebe6; --muted: #9aa69f; --line: #2c3a33; --bg: #121815; --accent: #7fb59d; --soft: #1a2420; } }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.65 -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
nav { display: flex; flex-wrap: wrap; gap: 6px 12px; padding-bottom: 12px; color: var(--muted); font-size: 14px; }
nav + nav { padding-top: 0; border-bottom: 1px solid var(--line); padding-bottom: 18px; }
a { color: var(--accent); }
h1 { margin: 28px 0 6px; font: 600 30px/1.2 Georgia, serif; }
h2 { margin: 28px 0 6px; font-size: 18px; }
.updated { color: var(--muted); font-size: 14px; }
blockquote { margin: 12px 0; padding: 4px 18px; border-left: 3px solid var(--line); background: var(--soft); }
.stats { padding: 12px 16px; border: 1px solid var(--line); border-radius: 10px; }
.stats p { margin: 0 0 10px; }
.stats button { font: inherit; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer; }
</style>
</head>
<body>
<main>
<nav><a href="../../">Ling</a> · ${links}</nav>
<nav>${languages}</nav>
<h1>${t.titles[key]}</h1>
<p class="updated">${t.updated}</p>
${t[key]().trim()}
</main>
${key === 'cookies' ? statsScript(t.stats) : ''}
</body>
</html>
`
}

/** Old addresses (offer.html, and the earlier Ukrainian/English set) keep working by forwarding to the terms. */
const redirect = (to) => `<!doctype html>
<html><head><meta charset="utf-8" /><meta http-equiv="refresh" content="0; url=${to}" /><link rel="canonical" href="${to}" /><title>Ling</title></head>
<body><a href="${to}">${to}</a></body></html>
`

for (const lang of LANGUAGES) {
  fs.mkdirSync(`public/legal/${lang}`, { recursive: true })
  for (const key of PAGES) fs.writeFileSync(`public/legal/${lang}/${key}.html`, page(lang, key))
  fs.writeFileSync(`public/legal/${lang}/offer.html`, redirect('terms.html'))
}
console.log(`Legal pages written to public/legal/{${LANGUAGES.join(',')}}/`)
