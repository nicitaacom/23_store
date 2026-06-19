# What inside? <br/> <sub> https://23-store.vercel.app/</sub>

[![23-store-overview](https://i.imgur.com/F7cHLzw.jpeg)](https://youtu.be/xZ1DOfFfpc8)

<br/>

<br/>

<br/>

## Project info

### Performance - 35 mobile / 73 desktop (01.03.2024)

### Performance - 60 mobile / ? desktop (10.03.2024)

### Performance - 74 mobile / 94 desktop (24.03.2024)

### Performance - 65 mobile / 99 desktop [(15.07.2024)](https://pagespeed.web.dev/analysis/https-23-store-vercel-app/3fq2wnx6g5?form_factor=mobile)

### Performance - 85 mobile / 92 desktop [(16.08.2025)](https://pagespeed.web.dev/analysis/https-23-store-vercel-app/fmcrucab20?form_factor=mobile)

![perf-85-mobile](https://i.imgur.com/bqmLWzW.png)

![perf-92-desktop](https://i.imgur.com/FwBjtBt.png)

### Stack - Next + TypeScript + Tailwind + supabase + zustand + stripe

<br/>

<br/>

<br/>

# Clone repository

## Step 1.1 - clone repository (variant 1)

![alt text](https://i.imgur.com/9KSgjaN.png)

## or Step 1.1 - clone repository (variant 2)

```
git clone https://github.com/nicitaacom/23_store
cd 23_store
```

## Step 1.2 - install deps

```
pnpm i
```

<br/>

<br/>

<br/>

## Step 2 - setup .env (variant 1 - dockerized)

### Step 2.1 Prerequirements - install docker

Commands (also available with video guide on YouTube - https://www.youtube.com/watch?v=O2D6rPJI2oM)

```bash
sudo apt update
sudo apt intall -y docker.io
sudo systemctl enable docker --now
sudo usermod -aG docker $USER
sudo reboot
```

### Step 2.2 - build docker image and run docker container

```bash
docker build -t joki .
docker run -dp 3000:3000 joki
```

To stop docker use - `docker stop <container_id_or_name>`

## Step 2 - setup .env (variant 2 - manually)

### 2.1 - google cloud console

[![setup_google_video](https://i.imgur.com/s8F1YYA.png)](https://streamable.com/blib2f)

### 2.2 - supabase

Login in supabase - https://app.supabase.com/sign-in
![Login in supabase](https://i.imgur.com/zxJFahy.png)

### 2.3 - supabase

![Click new project](https://i.imgur.com/9YZGJ8j.png)

### 2.4 - supabase

![Enter aer](https://i.imgur.com/zxJFahy.png)

### 2.5 - supabase

![Set up supabase project](https://i.imgur.com/0xIb866.png)

### 2.6 - supabase

![Copy .env](https://i.imgur.com/Rh6rHtg.png)

### 2.7 - supabase

![Paste .env](https://i.imgur.com/KI7jpAR.png)

### 2.8 - supabase setup

[supabase-sql](./dev_readme-supbase-sql.md)

### 2.9 - stripe - login/register

stripe - https://app.supabase.com/sign-in

![login/register in stripe](https://i.imgur.com/D7OZC93.png)

### 2.10 - stripe

![copy .env](https://i.imgur.com/1BgzWI2.png)

### 2.11 - stripe

![paste .env](https://i.imgur.com/LPiFK31.png)

### 2.12 - resend - login/register

![login/register in resend.com](https://i.imgur.com/reEKSuH.png)

### 2.13 - resend - buy your domain

![buy and add domain in resend](https://i.imgur.com/DAAQgbN.png)

### 2.14 - resend

![copy .env](https://i.imgur.com/gFqtYtU.png)

### 2.15 - resend

Alternativaly if you have problems on this step you may check guide on YouTube
`how to setup resend` or `how to send email using react`

### 2.16 - your email you send emails from

`NEXT_PUBLIC_SUPPORT_EMAIL='your_email_where_you_send_messages_from'`

It may be your email based on your domain like youremail@yourdomain.smth

### 2.17 - paypal

1. Google - paypal developer - login/register
2. Use this guide - https://developer.paypal.com/api/rest/
   ![copy .env](https://i.imgur.com/8G5BXuq.png)

### 2.18 - paypal

1. Click 'Create App' - in case you haven't one
2. Click on your app name in my case 'Platform Partner App - 5321855133911008505'
   ![copy .env](https://i.imgur.com/ojdT3vb.png)

### 2.19 - paypal

![copy .env](https://i.imgur.com/BLvt8O1.png)

### 2.20 - paypal

![copy .env](https://i.imgur.com/3b0Shg7.png)

### 2.21 - metamask

1. I suppose that you advanced PC user and able to register/login in metamask
   ![copy metamask address](https://i.imgur.com/l9nTHB6.png)

### 2.22 - metamsk

![paste metamask address](https://i.imgur.com/r5Xai6j.png)

### 2.23 - coinmarketcap

1. login/register in coinmarketcap developer (google - coinmarketcap developer - login - etc)

![copy .env](https://i.imgur.com/w2aTQki.png)

### 2.24 - coinmarketcap

![paste .env](https://i.imgur.com/i5n4wDH.png)

## Step 2.25 - run project

```
pnpm dev
```

<br/>

<br/>

<br/>

# Feedback

If you found some bug/issue - just go ahead and open a new issue
