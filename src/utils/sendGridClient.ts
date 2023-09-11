import sgMail from '@sendgrid/mail';


const sendGrid = sgMail.setApiKey(import.meta.env.VITE_SENDGRID_PUBLIC);

export default sendGrid
