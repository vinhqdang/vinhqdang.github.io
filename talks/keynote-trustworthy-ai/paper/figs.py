import numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'font.family':'serif','font.serif':['DejaVu Serif'],'font.size':9,'axes.spines.top':False,'axes.spines.right':False})
C={'b':'#2457D6','a':'#B7791F','g':'#17855A','r':'#C8362F','k':'#222222','m':'#777777'}
rng=np.random.default_rng(7)
def save(f,n): f.savefig(n,dpi=300,bbox_inches='tight',pil_kwargs={'quality':92}); plt.close(f)
# Fig1 timeline
def X(y): return (y-1940)*0.34 if y<2000 else 20.4+(y-2000)*6.5
rows=[('Why?',C['b'],[(2001,'two cultures'),(2014,'saliency'),(2016,'LIME'),(2017,'SHAP, IG'),(2018,'sanity checks'),(2019,'GNN explainers')]),
('How sure?',C['a'],[(1945,'SPRT'),(1954,'CUSUM'),(2005,'conformal'),(2016,'MC dropout'),(2017,'calibration'),(2019,'CQR, shift'),(2021,'betting'),(2023,'anytime-valid')]),
('Is it true?',C['g'],[(2017,'SMT verification'),(2018,'FEVER, CHAIR'),(2020,'RAG'),(2021,'risk control'),(2023,'FActScore, POPE'),(2024,'conformal factuality')]),
('Attacked?',C['r'],[(1964,'robust statistics'),(1982,'Byzantine'),(2006,'differential privacy'),(2014,'adversarial examples'),(2017,'FL, Krum'),(2019,'smoothing'),(2021,'unlearning'),(2023,'prompt injection')])]
f,ax=plt.subplots(figsize=(7.6,3.8))
for i,(nm,c,ms) in enumerate(rows):
    y=(3-i)*1.3; ax.plot([0,X(2026)],[y,y],color=c,alpha=.3,lw=3); ax.text(-1.5,y,nm,ha='right',va='center',color=c,fontweight='bold')
    for j,(yr,l) in enumerate(ms):
        off=[0.16,-0.16,0.36,-0.36][j%4]; ax.plot(X(yr),y,'o',color=c,ms=5); ax.text(X(yr),y+off,l,ha='center',va='bottom' if off>0 else 'top',fontsize=6.5)
ax.axvline(20.4,color=C['m'],ls=':',lw=.8)
t=[1940,2000,2005,2010,2015,2020,2025]; ax.set_xticks([X(v) for v in t]); ax.set_xticklabels(t)
ax.set_yticks([]); ax.spines['left'].set_visible(False); ax.set_xlim(-1,X(2026.5)); ax.set_ylim(-0.7,4.6)
ax.set_xlabel('Year (1940–2000 compressed)')
save(f,'fig1.jpg')
# Fig2: (a) reliability illustration (b) split conformal coverage simulation
f,(a1,a2)=plt.subplots(1,2,figsize=(7.2,2.8))
cf=np.arange(.15,1,.1); a1.plot(cf,[.12,.2,.28,.37,.44,.5,.57,.63,.7],'o-',color=C['r'],ms=3,label='raw softmax (illustrative)')
a1.plot(cf,[.14,.24,.34,.44,.54,.63,.73,.83,.92],'s-',color=C['g'],ms=3,label='after temperature scaling')
a1.plot([0,1],[0,1],'k--',lw=.8); a1.set_xlabel('stated confidence'); a1.set_ylabel('observed accuracy'); a1.legend(fontsize=7,frameon=False); a1.set_title('(a) Calibration',fontsize=9)
alpha=.1; R=4000
for n,c in [(20,C['a']),(100,C['b']),(1000,C['g'])]:
    covs=[]
    for _ in range(R):
        s=rng.standard_t(3,size=n); k=int(np.ceil((n+1)*(1-alpha)))
        q=np.sort(s)[k-1] if k<=n else np.inf
        covs.append(np.mean(rng.standard_t(3,size=200)<=q))
    a2.hist(covs,bins=40,range=(.6,1),histtype='step',lw=1.4,color=c,density=True,label=f'n = {n}  (mean {np.mean(covs):.3f})')
a2.axvline(1-alpha,color='k',ls='--',lw=.8); a2.set_xlabel('test coverage of one calibration draw'); a2.set_ylabel('density'); a2.legend(fontsize=7,frameon=False,loc='upper left'); a2.set_title('(b) Split conformal, target 0.90',fontsize=9)
save(f,'fig2.jpg')
# Fig3: (a) repeated testing false alarm (b) betting wealth
f,(a1,a2)=plt.subplots(1,2,figsize=(7.2,2.8))
T=1000; R=2000; looks=np.arange(1,T+1)
X0=rng.normal(size=(R,T)); S=np.cumsum(X0,axis=1)/np.sqrt(looks)
fa=np.mean(np.maximum.accumulate(S>1.645,axis=1),axis=0)
# e-process with bounded X in [0,1], mu0=0.5, mixture of lambdas
lams=np.array([.1,.2,.4,.8])
Xb=rng.uniform(0,1,size=(R,T))
W=np.mean(np.exp(np.cumsum(np.log1p(lams[:,None,None]*(Xb[None]-.5)),axis=2)),axis=0)
fe=np.mean(np.maximum.accumulate(W>=20,axis=1),axis=0)
a1.plot(looks,fa,color=C['r'],label='z-test at level 0.05, every step'); a1.plot(looks,fe,color=C['g'],label='e-process, alarm at W ≥ 1/0.05')
a1.axhline(.05,color='k',ls='--',lw=.8); a1.set_xscale('log'); a1.set_xlabel('number of looks'); a1.set_ylabel('P(any false alarm so far)'); a1.legend(fontsize=7,frameon=False); a1.set_title('(a) Peeking breaks fixed tests',fontsize=9)
x=np.r_[rng.uniform(0,1,300),np.clip(rng.uniform(0,1,300)+.15,0,1)]
w=np.mean(np.exp(np.cumsum(np.log1p(lams[:,None]*(x[None]-.5)),axis=1)),axis=0)
a2.semilogy(w,color=C['b']); a2.axhline(20,color=C['r'],ls='--',lw=.8); a2.axvline(300,color=C['m'],ls=':',lw=.8)
a2.text(150,40,'healthy',ha='center',fontsize=8); a2.text(450,40,'shift',ha='center',fontsize=8); a2.text(5,25,'1/α',color=C['r'],fontsize=8)
a2.set_xlabel('time'); a2.set_ylabel('wealth $W_t$ (log scale)'); a2.set_title('(b) One betting path',fontsize=9)
save(f,'fig3.jpg')
# Fig4: robust aggregation simulation
f,ax=plt.subplots(figsize=(4.6,2.8))
eps=np.linspace(0,.45,19); R=400; n=100; d=50
def run(agg):
    out=[]
    for e in eps:
        err=[]
        for _ in range(R//8):
            g=rng.normal(1,1,size=(n,d)); k=int(e*n); g[:k]=-10
            err.append(np.linalg.norm(agg(g)-1)/np.sqrt(d))
        out.append(np.mean(err))
    return out
tm=lambda g: np.mean(np.sort(g,axis=0)[int(.2*len(g)):int(.8*len(g))],axis=0)
for nm,fn,c in [('mean',lambda g:g.mean(0),C['r']),('20% trimmed mean',tm,C['a']),('coordinate-wise median',lambda g:np.median(g,0),C['g'])]:
    ax.plot(eps,run(fn),'o-',ms=3,color=c,label=nm)
ax.set_yscale('log'); ax.set_xlabel('fraction of malicious updates'); ax.set_ylabel('aggregation error (RMS)'); ax.legend(fontsize=7,frameon=False)
save(f,'fig4.jpg')
print('done')
